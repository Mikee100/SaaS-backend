"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seed_permissions_1 = require("../scripts/seed-permissions");
const seed_default_roles_1 = require("../scripts/seed-default-roles");
const seed_plans_1 = require("../scripts/seed-plans");
const create_superadmin_1 = require("../scripts/create-superadmin");
async function main() {
    await (0, seed_permissions_1.seedPermissions)();
    await (0, seed_default_roles_1.seedDefaultRoles)();
    await (0, seed_plans_1.seedPlans)();
    await (0, create_superadmin_1.default)();
}
main()
    .catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map