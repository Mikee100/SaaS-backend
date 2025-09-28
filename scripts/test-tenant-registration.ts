import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Add error handling for unhandled promise rejections
process.on('unhandledRejection', (error: any) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Types
type TenantData = {
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone?: string;
  branchName: string;
  owner: {
    name: string;
    email: string;
    password: string;
  };
  // Additional fields from form
  businessCategory?: string;
  businessSubcategory?: string;
  businessDescription?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  foundedYear?: number;
  employeeCount?: string;
  annualRevenue?: string;
  primaryProducts?: string[];
  secondaryProducts?: string[];
  kraPin?: string;
  vatNumber?: string;
  businessLicense?: string;
  website?: string;
};

// Configuration
const API_URL = 'http://localhost:9000'; // Backend runs on port 9000
const prisma = new PrismaClient();

// Helper functions
async function cleanupTestData(email: string, tenantName: string) {
  try {
    // Delete test user if exists
    await prisma.user.deleteMany({
      where: { email },
    });

    // Find tenant by name first to get the ID
    const tenant = await prisma.tenant.findFirst({
      where: { name: tenantName },
      select: { id: true }
    });

    if (tenant) {
      // Delete related records first (branches, roles, etc.)
      await prisma.branch.deleteMany({
        where: { tenantId: tenant.id }
      });

      await prisma.role.deleteMany({
        where: { tenantId: tenant.id }
      });

      await prisma.userRole.deleteMany({
        where: { tenantId: tenant.id }
      });

      // Then delete the tenant
      await prisma.tenant.delete({
        where: { id: tenant.id },
      });
    }
    
    console.log('✅ Cleaned up test data');
  } catch (error: any) {
    // If data doesn't exist, that's fine
    if (!error.toString().includes('RecordNotFound') && 
        !error.toString().includes('does not exist') &&
        !error.toString().includes('No Tenant found')) {
      console.error('Error cleaning up test data:', error);
    }
  }
}

// Main test function
async function testTenantRegistration() {
  // Generate unique test data
  const testTenant: TenantData = {
    name: `Test Business ${Math.floor(Math.random() * 10000)}`,
    businessType: 'Retail',
    businessCategory: 'Retail',
    businessSubcategory: 'Electronics',
    businessDescription: 'Test business for registration',
    contactEmail: `test${Math.floor(Math.random() * 10000)}@example.com`,
    contactPhone: '+254700000000',
    branchName: 'Headquarters',
    website: 'https://testbusiness.com',
    address: '123 Test Street',
    city: 'Nairobi',
    state: 'Nairobi County',
    country: 'Kenya',
    postalCode: '00100',
    foundedYear: 2023,
    employeeCount: '1-10',
    annualRevenue: '1M-10M KES',
    primaryProducts: ['Electronics'],
    secondaryProducts: [],
    kraPin: 'A123456789B',
    vatNumber: 'VAT123456',
    businessLicense: 'LIC789',
    owner: {
      name: 'Test Owner',
      email: `owner${Math.floor(Math.random() * 10000)}@test.com`,
      password: 'Password123!',
    },
  };

  console.log('🚀 Testing tenant registration with data:', JSON.stringify(testTenant, null, 2));

  try {
    // Clean up any existing test data
    await cleanupTestData(testTenant.owner.email, testTenant.name);

    // Make the registration request
    console.log('\n📡 Sending registration request to /tenant...');
    const response = await axios.post(`${API_URL}/tenant`, testTenant, {
      validateStatus: () => true, // Don't throw on HTTP error status codes
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Log full response for debugging
    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response data:', JSON.stringify(response.data, null, 2));

    if (response.status >= 200 && response.status < 300) {
      console.log('\n✅ Registration successful!');
      console.log('\n📋 Response data:', JSON.stringify(response.data, null, 2));

      // Verify the data was saved correctly
      console.log('\n🔍 Verifying database records...');
      
      // Verify tenant
      const savedTenant = await prisma.tenant.findFirst({
        where: { name: testTenant.name },
      });
      console.log('📊 Saved tenant:', savedTenant ? '✅ Found' : '❌ Not found');

      if (savedTenant) {
        // Verify user
        const savedUser = await prisma.user.findFirst({
          where: { 
            email: testTenant.owner.email,
            tenantId: savedTenant.id
          },
        });
        console.log('👤 Saved user:', savedUser ? '✅ Found' : '❌ Not found');

        // Verify branch
        const savedBranch = await prisma.branch.findFirst({
          where: { 
            tenantId: savedTenant.id,
            name: testTenant.branchName
          },
        });
        console.log('🏢 Saved branch:', savedBranch ? '✅ Found' : '❌ Not found');
        if (savedBranch) {
          console.log('🏢 Branch name:', savedBranch.name);
          if (savedBranch.name !== testTenant.branchName) {
            console.error('❌ Branch name mismatch! Expected:', testTenant.branchName, 'Got:', savedBranch.name);
          } else {
            console.log('✅ Branch name matches expected value');
          }
        }

        // Verify owner role assignment
        const ownerRole = await prisma.role.findFirst({
          where: {
            name: 'owner',
            tenantId: savedTenant.id
          }
        });
        console.log('👑 Owner role:', ownerRole ? '✅ Found' : '❌ Not found');
      }

      console.log('\n🎉 All tests completed successfully!');
      
      return {
        success: true,
        data: response.data
      };
    } else {
      console.error('\n❌ Registration failed with status:', response.status);
      console.error('Response data:', response.data);
      return {
        success: false,
        status: response.status,
        error: response.data
      };
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error);
    }
    return {
      success: false,
      error: error.message,
      response: error.response?.data
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
console.log('🚀 Starting tenant registration test...');
testTenantRegistration()
  .then((result) => {
    if (!result.success) {
      console.error('\n❌ Test failed');
      process.exit(1);
    }
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unhandled error in test:', error);
    process.exit(1);
  });
