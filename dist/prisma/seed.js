"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seed_permissions_1 = require("../scripts/seed-permissions");
async function main() {
    await (0, seed_permissions_1.seedPermissions)();
}
main()
    .catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map