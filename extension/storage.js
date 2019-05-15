'use strict';
import { openDB } from './vendor/idb/index.js';


const VERSION = 1;

const UPGRADES = [
    db => {
        db.createObjectStore('account', { keyPath: 'id' });
        db.createObjectStore('music', { keyPath: 'id' }).createIndex('user', ['user_id', 'status'], { unique: false });
    },
];


export default class Storage {
    constructor(name, version = VERSION) {
        this.name = name;
        this.version = version;
    }

    /**
     * Open database
     * @returns {IDBDatabase}
     */
    async open() {
        return this._database = await openDB(this.name, this.version, {
            upgrade(db, oldVersion, newVersion, transaction) {
                for (let i = oldVersion; i < newVersion; i ++) {
                    (UPGRADES[i])(db, transaction);
                }
            }
        });
    }

    /**
     * Get logger
     * @returns {Logger}
     */
    get logger() {
        if (!this._logger) {
            throw new Error('Logger has not initialized.');
        }
        return this._logger;
    }

    /**
     * Set logger
     * @param {Logger} logger 
     */
    set logger(logger) {
        this._logger = logger;
    }

    /**
     * Get database
     * @returns {IDBDatabase}
     */
    get database() {
        if (!this._database) {
            throw new Error('Database has not opened.');
        }
        return this._database;
    }

    /**
     * Close database
     */
    close() {
        return this.database.close();
    }

    /**
     * Get last error
     * @returns {any}
     */
    get lastError() {
        return this._lastError;
    }

    async add(storeName, item, key) {
        try {
            if (this._tx) {
                return this._tx.objectStore(storeName).add(item, key);
            } else {
                return await this.database.add(storeName, item, key);
            }
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    async put(storeName, item, key) {
        try {
            if (this._tx) {
                return this._tx.objectStore(storeName).put(item, key);
            } else {
                return await this.database.put(storeName, item, key);
            }
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    async get(storeName, key) {
        try {
            if (this._tx) {
                return this._tx.objectStore(storeName).get(key);
            } else {
                return await this.database.get(storeName, key);
            }
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    /**
     * Begin a transaction
     * @returns {Transaction}
     */
    begin(storeNames, mode) {
        return this._tx = this.database.transaction(storeNames, mode);
    }

    /**
     * End a transaction
     */
    async end() {
        await this._tx.done;
        this._tx = undefined;
    }
}
