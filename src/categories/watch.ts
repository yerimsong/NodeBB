import db from '../database';
import user from '../user';

interface WatchStatesType {
    ignoring: number;
    notwatching: number;
    watching: number;
}

interface CategoriesType {
    watchStates: WatchStatesType;
    isIgnored: (cids: number[], uid: string) => Promise<boolean[]>;
    getWatchState: (arg0: number[], arg1: string) => Promise<number[]>;
    getIgnorers: (cid: number, start: number, stop: number) => Promise<number[]>;
    filterIgnoringUids: (cid: number, uids: string[]) => Promise<string[]>;
    getUidsWatchStates: (arg0: number, arg1: string[]) => Promise<number[]>;
}

interface UserSettings {
    categoryWatchState: number
}

export = function (Categories: CategoriesType) {
    Categories.watchStates = {
        ignoring: 1,
        notwatching: 2,
        watching: 3,
    };

    Categories.isIgnored = async function (cids: number[], uid: string) {
        if (!(parseInt(uid, 10) > 0)) {
            return cids.map(() => false);
        }
        const states = await Categories.getWatchState(cids, uid);
        return states.map((state: number) => state === Categories.watchStates.ignoring);
    };

    Categories.getWatchState = async function (cids: number[], uid: string) {
        if (!(parseInt(uid, 10) > 0)) {
            return cids.map(() => Categories.watchStates.notwatching);
        }
        if (!Array.isArray(cids) || !cids.length) {
            return [];
        }
        const keys = cids.map(cid => `cid:${cid}:uid:watch:state`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [userSettings, states] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            user.getSettings(uid) as UserSettings,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetsScore(keys, uid) as number[],
        ]);
        const user_watch_state = userSettings.categoryWatchState;
        let curr_state = -1;
        if (user_watch_state === 1) curr_state = Categories.watchStates.ignoring;
        else if (user_watch_state === 2) curr_state = Categories.watchStates.notwatching;
        else if (user_watch_state === 3) curr_state = Categories.watchStates.watching;
        return states.map((state: number) => state || curr_state);
    };

    Categories.getIgnorers = async function (cid: number, start: number, stop: number) {
        const count = (stop === -1) ? -1 : (stop - start + 1);
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
           @typescript-eslint/no-unsafe-return */
        return await db.getSortedSetRevRangeByScore(`cid:${cid}:uid:watch:state`, start, count, Categories.watchStates.ignoring, Categories.watchStates.ignoring);
    };

    Categories.filterIgnoringUids = async function (cid: number, uids: string[]) {
        const states = await Categories.getUidsWatchStates(cid, uids);
        const readingUids = uids.filter((uid: string, index: number) => uid && states[index] !==
            Categories.watchStates.ignoring);
        return readingUids;
    };

    Categories.getUidsWatchStates = async function (cid: number, uids: string[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [userSettings, states] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            user.getMultipleUserSettings(uids) as UserSettings[],
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetScores(`cid:${cid}:uid:watch:state`, uids) as number[],
        ]);
        function helper(index: number) {
            const user_watch_state = userSettings[index].categoryWatchState;
            let curr_state = -1;
            if (user_watch_state === 1) curr_state = Categories.watchStates.ignoring;
            else if (user_watch_state === 2) curr_state = Categories.watchStates.notwatching;
            else if (user_watch_state === 3) curr_state = Categories.watchStates.watching;
            return curr_state;
        }
        return states.map((state: number, index: number) => state || helper(index));
    };
};
