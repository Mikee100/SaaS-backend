"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seed_permissions_1 = require("../scripts/seed-permissions");
const seed_default_roles_1 = require("../scripts/seed-default-roles");
async function main() {
    await (0, seed_permissions_1.seedPermissions)();
    await (0, seed_default_roles_1.seedDefaultRoles)();
}
main()
    .catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map