"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const database_1 = __importDefault(require("../database"));
const user_1 = __importDefault(require("../user"));
module.exports = function (Categories) {
    Categories.watchStates = {
        ignoring: 1,
        notwatching: 2,
        watching: 3,
    };
    Categories.isIgnored = function (cids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(parseInt(uid, 10) > 0)) {
                return cids.map(() => false);
            }
            const states = yield Categories.getWatchState(cids, uid);
            return states.map((state) => state === Categories.watchStates.ignoring);
        });
    };
    Categories.getWatchState = function (cids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(parseInt(uid, 10) > 0)) {
                return cids.map(() => Categories.watchStates.notwatching);
            }
            if (!Array.isArray(cids) || !cids.length) {
                return [];
            }
            const keys = cids.map(cid => `cid:${cid}:uid:watch:state`);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [userSettings, states] = yield Promise.all([
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                user_1.default.getSettings(uid),
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                database_1.default.sortedSetsScore(keys, uid),
            ]);
            const user_watch_state = userSettings.categoryWatchState;
            let curr_state = -1;
            if (user_watch_state === 1)
                curr_state = Categories.watchStates.ignoring;
            else if (user_watch_state === 2)
                curr_state = Categories.watchStates.notwatching;
            else if (user_watch_state === 3)
                curr_state = Categories.watchStates.watching;
            return states.map((state) => state || curr_state);
        });
    };
    Categories.getIgnorers = function (cid, start, stop) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = (stop === -1) ? -1 : (stop - start + 1);
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
               @typescript-eslint/no-unsafe-return */
            return yield database_1.default.getSortedSetRevRangeByScore(`cid:${cid}:uid:watch:state`, start, count, Categories.watchStates.ignoring, Categories.watchStates.ignoring);
        });
    };
    Categories.filterIgnoringUids = function (cid, uids) {
        return __awaiter(this, void 0, void 0, function* () {
            const states = yield Categories.getUidsWatchStates(cid, uids);
            const readingUids = uids.filter((uid, index) => uid && states[index] !==
                Categories.watchStates.ignoring);
            return readingUids;
        });
    };
    Categories.getUidsWatchStates = function (cid, uids) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [userSettings, states] = yield Promise.all([
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                user_1.default.getMultipleUserSettings(uids),
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                database_1.default.sortedSetScores(`cid:${cid}:uid:watch:state`, uids),
            ]);
            function helper(index) {
                const user_watch_state = userSettings[index].categoryWatchState;
                let curr_state = -1;
                if (user_watch_state === 1)
                    curr_state = Categories.watchStates.ignoring;
                else if (user_watch_state === 2)
                    curr_state = Categories.watchStates.notwatching;
                else if (user_watch_state === 3)
                    curr_state = Categories.watchStates.watching;
                return curr_state;
            }
            return states.map((state, index) => state || helper(index));
        });
    };
};
