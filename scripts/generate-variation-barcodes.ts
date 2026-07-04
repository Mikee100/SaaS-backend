import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const normalizeBarcode = (value: string | null | undefined): string =>
  (value || '').trim();

const sanitizeSku = (sku: string): string => {
  const normalized = sku.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length >= 8) return normalized.slice(0, 8);
  return normalized.padEnd(8, 'X');
};

const tenantPrefix = (tenantId: string): string => {
  const normalized = tenantId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return normalized.slice(0, 6).padEnd(6, 'X');
};

const buildGeneratedCode = (
  tenantId: string,
  sku: string,
  variationId: string,
  attempt: number,
): string => {
  const tp = tenantPrefix(tenantId);
  const skuToken = sanitizeSku(sku);
  const vToken = variationId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-6);
  if (attempt === 0) {
    return `VAR-${tp}-${skuToken}-${vToken}`;
  }
  return `VAR-${tp}-${skuToken}-${vToken}-${String(attempt).padStart(2, '0')}`;
};

async function main() {
  console.log('Starting barcode generation for existing product variations...');

  const variations = await prisma.productVariation.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      tenantId: true,
      barcodes: {
        where: {
          isActive: true,
          isPrimary: true,
        },
        select: {
          id: true,
          code: true,
        },
      },
    },
    orderBy: [{ tenantId: 'asc' }, { createdAt: 'asc' }],
  });

  if (variations.length === 0) {
    console.log('No active variations found. Nothing to do.');
    return;
  }

  const tenantCodeSet = new Map<string, Set<string>>();
  const tenantCodes = await prisma.productVariationBarcode.findMany({
    select: {
      tenantId: true,
      code: true,
    },
  });

  for (const row of tenantCodes) {
    if (!tenantCodeSet.has(row.tenantId)) {
      tenantCodeSet.set(row.tenantId, new Set<string>());
    }
    tenantCodeSet.get(row.tenantId)?.add(row.code);
  }

  let createdFromLegacy = 0;
  let generatedNew = 0;
  let skippedHasPrimary = 0;
  let skippedNoCodePossible = 0;

  for (const variation of variations) {
    if (variation.barcodes.length > 0) {
      skippedHasPrimary += 1;
      continue;
    }

    if (!tenantCodeSet.has(variation.tenantId)) {
      tenantCodeSet.set(variation.tenantId, new Set<string>());
    }

    const usedCodes = tenantCodeSet.get(variation.tenantId)!;
    let codeToUse = normalizeBarcode(variation.barcode);
    let usedLegacy = false;

    if (codeToUse && usedCodes.has(codeToUse)) {
      codeToUse = '';
    } else if (codeToUse) {
      usedLegacy = true;
    }

    if (!codeToUse) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = buildGeneratedCode(
          variation.tenantId,
          variation.sku,
          variation.id,
          attempt,
        );

        if (!usedCodes.has(candidate)) {
          codeToUse = candidate;
          break;
        }
      }
    }

    if (!codeToUse) {
      skippedNoCodePossible += 1;
      console.warn(`Could not generate unique barcode for variation ${variation.id}`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.productVariationBarcode.updateMany({
        where: {
          variationId: variation.id,
          isPrimary: true,
          isActive: true,
        },
        data: {
          isPrimary: false,
          isActive: false,
          deletedAt: new Date(),
        },
      });

      await tx.productVariationBarcode.upsert({
        where: {
          tenantId_code: {
            tenantId: variation.tenantId,
            code: codeToUse,
          },
        },
        create: {
          id: randomUUID(),
          tenantId: variation.tenantId,
          variationId: variation.id,
          code: codeToUse,
          type: 'CODE128',
          isPrimary: true,
          isActive: true,
        },
        update: {
          variationId: variation.id,
          isPrimary: true,
          isActive: true,
          deletedAt: null,
        },
      });

      await tx.productVariation.update({
        where: { id: variation.id },
        data: { barcode: codeToUse },
      });
    });

    usedCodes.add(codeToUse);
    if (usedLegacy) {
      createdFromLegacy += 1;
    } else {
      generatedNew += 1;
    }
  }

  console.log('Barcode generation completed.');
  console.log(`Total active variations scanned: ${variations.length}`);
  console.log(`Skipped (already had active primary barcode): ${skippedHasPrimary}`);
  console.log(`Primary barcode records created from existing legacy barcode: ${createdFromLegacy}`);
  console.log(`Primary barcode records generated new: ${generatedNew}`);
  console.log(`Skipped (could not generate unique code): ${skippedNoCodePossible}`);
}

main()
  .catch((error) => {
    console.error('Failed generating variation barcodes:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
