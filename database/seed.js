"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Create roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: {
            name: 'ADMIN',
            description: 'System administrator with full access',
        },
    });
    const userRole = await prisma.role.upsert({
        where: { name: 'USER' },
        update: {},
        create: {
            name: 'USER',
            description: 'Standard user with basic access',
        },
    });
    const pimManagerRole = await prisma.role.upsert({
        where: { name: 'PIM_MANAGER' },
        update: {},
        create: {
            name: 'PIM_MANAGER',
            description: 'PIM system manager with elevated access',
        },
    });
    const merchandiserRole = await prisma.role.upsert({
        where: { name: 'MERCHANDISER' },
        update: {},
        create: {
            name: 'MERCHANDISER',
            description: 'Merchandiser with product management access',
        },
    });
    console.log('✅ Roles created');
    // Create applications
    const pimProdApp = await prisma.application.upsert({
        where: { code: 'pim-production' },
        update: {},
        create: {
            name: 'PIM - Production',
            code: 'pim-production',
            description: 'Product Information Management system (Production environment)',
            category: 'OPERATIONS',
            url: 'https://pim.logogear.co.in/prod',
            environment: 'PRODUCTION',
            isActive: true,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const pimStagingApp = await prisma.application.upsert({
        where: { code: 'pim-staging' },
        update: {},
        create: {
            name: 'PIM - Staging',
            code: 'pim-staging',
            description: 'Product Information Management system (Staging environment)',
            category: 'OPERATIONS',
            url: 'https://pim.logogear.co.in/staging',
            environment: 'STAGING',
            isActive: true,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const analyticsApp = await prisma.application.upsert({
        where: { code: 'analytics-dashboard' },
        update: {},
        create: {
            name: 'Analytics Dashboard',
            code: 'analytics-dashboard',
            description: 'Business intelligence and analytics platform',
            category: 'SALES',
            url: null, // Coming soon
            environment: 'PRODUCTION',
            isActive: false,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: false,
                tokenPassthrough: true,
            }),
        },
    });
    const orderManagementApp = await prisma.application.upsert({
        where: { code: 'order-management' },
        update: {},
        create: {
            name: 'Order Management',
            code: 'order-management',
            description: 'Order processing and management system for corporate merchandise',
            category: 'OPERATIONS',
            url: null, // Coming soon
            environment: 'PRODUCTION',
            isActive: false,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const zohoApp = await prisma.application.upsert({
        where: { code: 'zoho-crm' },
        update: {},
        create: {
            name: 'Zoho CRM',
            code: 'zoho-crm',
            description: 'Customer relationship management and sales tracking system',
            category: 'SALES',
            url: 'https://crm.zoho.com',
            environment: 'PRODUCTION',
            isActive: true,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const salesforceApp = await prisma.application.upsert({
        where: { code: 'salesforce-journey' },
        update: {},
        create: {
            name: 'Journey to Salesforce',
            code: 'salesforce-journey',
            description: 'Advanced CRM and customer journey management platform',
            category: 'SALES',
            url: 'https://salesforce.com',
            environment: 'PRODUCTION',
            isActive: true,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const redemptionApp = await prisma.application.upsert({
        where: { code: 'redemption-portal' },
        update: {},
        create: {
            name: 'Redemption Portal',
            code: 'redemption-portal',
            description: 'Employee rewards and corporate gift redemption system',
            category: 'OPERATIONS',
            url: null, // Coming soon
            environment: 'PRODUCTION',
            isActive: false,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const merchandiseApp = await prisma.application.upsert({
        where: { code: 'merchandise-catalog' },
        update: {},
        create: {
            name: 'Merchandise Catalog',
            code: 'merchandise-catalog',
            description: 'Browse and order corporate merchandise and promotional items',
            category: 'OPERATIONS',
            url: null, // Coming soon
            environment: 'PRODUCTION',
            isActive: false,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    const vendorApp = await prisma.application.upsert({
        where: { code: 'vendor-management' },
        update: {},
        create: {
            name: 'Vendor Management',
            code: 'vendor-management',
            description: 'Manage suppliers, vendors, and procurement processes',
            category: 'OPERATIONS',
            url: null, // Coming soon
            environment: 'PRODUCTION',
            isActive: false,
            ssoConfig: JSON.stringify({
                type: 'oidc',
                autoLaunch: true,
                tokenPassthrough: true,
            }),
        },
    });
    console.log('✅ Applications created');
    // Create application permissions
    await prisma.applicationPermission.upsert({
        where: {
            applicationId_roleId: {
                applicationId: pimProdApp.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            applicationId: pimProdApp.id,
            roleId: adminRole.id,
            permissionLevel: 'ADMIN',
        },
    });
    await prisma.applicationPermission.upsert({
        where: {
            applicationId_roleId: {
                applicationId: pimProdApp.id,
                roleId: pimManagerRole.id,
            },
        },
        update: {},
        create: {
            applicationId: pimProdApp.id,
            roleId: pimManagerRole.id,
            permissionLevel: 'EDIT',
        },
    });
    await prisma.applicationPermission.upsert({
        where: {
            applicationId_roleId: {
                applicationId: pimProdApp.id,
                roleId: merchandiserRole.id,
            },
        },
        update: {},
        create: {
            applicationId: pimProdApp.id,
            roleId: merchandiserRole.id,
            permissionLevel: 'EDIT',
        },
    });
    await prisma.applicationPermission.upsert({
        where: {
            applicationId_roleId: {
                applicationId: pimStagingApp.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            applicationId: pimStagingApp.id,
            roleId: adminRole.id,
            permissionLevel: 'ADMIN',
        },
    });
    console.log('✅ Application permissions created');
    // Create a development user
    const devUser = await prisma.user.upsert({
        where: { email: 'developer@logogear.co.in' },
        update: {},
        create: {
            externalId: 'dev-user-1',
            email: 'developer@logogear.co.in',
            name: 'Development User',
            department: 'IT',
            status: 'ACTIVE',
            preferences: JSON.stringify({
                timezone: 'Asia/Kolkata',
                language: 'en',
                theme: 'light',
                notifications: {
                    email: true,
                    inApp: true,
                },
            }),
        },
    });
    // Assign roles to development user
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: devUser.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: devUser.id,
            roleId: adminRole.id,
        },
    });
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: devUser.id,
                roleId: userRole.id,
            },
        },
        update: {},
        create: {
            userId: devUser.id,
            roleId: userRole.id,
        },
    });
    console.log('✅ Development user created with admin access');
    console.log('🎉 Database seeded successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map