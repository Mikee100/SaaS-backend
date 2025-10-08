"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seed_permissions_1 = require("../scripts/seed-permissions");
const seed_default_roles_1 = require("../scripts/seed-default-roles");
const seed_plans_1 = require("../scripts/seed-plans");
async function main() {
    await (0, seed_permissions_1.seedPermissions)();
    await (0, seed_default_roles_1.seedDefaultRoles)();
    await (0, seed_plans_1.seedPlans)();
}
main()
    .catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map