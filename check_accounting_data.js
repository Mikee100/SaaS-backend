const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const journalEntries = await prisma.journalEntry.findMany({
      include: {
        ledgerEntries: {
          include: { account: true },
        },
      },
    });

    console.log('Total Journal Entries:', journalEntries.length);
    if (journalEntries.length > 0) {
      console.log('Sample Entry:', JSON.stringify(journalEntries[0], null, 2));
      
      const revenue = journalEntries.filter(je => je.ledgerEntries.some(le => le.account.type === 'revenue'));
      const expenses = journalEntries.filter(je => je.ledgerEntries.some(le => le.account.type === 'expense'));
      
      console.log('Revenue Entries:', revenue.length);
      console.log('Expense Entries:', expenses.length);

      const accounts = await prisma.account.findMany();
      console.log('Total Accounts:', accounts.length);
      console.log('Account Types:', [...new Set(accounts.map(a => a.type))]);
      console.log('Account Subtypes:', [...new Set(accounts.map(a => a.subtype))]);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
