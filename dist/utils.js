"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loadCollection = function (colName, db) {
    return new Promise(resolve => {
        db.loadDatabase({}, () => {
            const _collection = db.getCollection(colName) || db.addCollection(colName);
            resolve(_collection);
        });
    });
};
exports.loadCollection = loadCollection;
//# sourceMappingURL=utils.js.map