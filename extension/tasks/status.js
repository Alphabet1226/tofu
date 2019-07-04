'use strict';
import {TaskError, Task} from '../service.js';


const URL_TIMELINE = 'https://m.douban.com/rexxar/api/v2/status/user_timeline/{uid}?max_id={maxId}&ck={ck}&for_mobile=1';


export default class Status extends Task {
    async run() {
        this.total = this.session.userInfo.statuses_count;

        let baseURL = URL_TIMELINE
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        let lastRow = await this.storage.status.orderBy('id').limit(1).first();
        let maxId = lastRow ? lastRow.id : '', count;
        do {
            let response = await this.fetch(baseURL.replace('{maxId}', maxId), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/statuses'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            count = json.items.length;
            for (let item of json.items) {
                let status = item.status;
                item.id = parseInt(status.id);
                item.created = Date.now();
                maxId = status.id;
                try {
                    await this.storage.status.add(item);
                } catch (e) {
                    if (e.name == 'ConstraintError') {
                        this.logger.debug(e.message);
                        this.complete();
                        return;
                    }
                    throw e;
                }
                this.step();
            }
        } while (count > 0 || (maxId = '') == '');
        this.complete();
    }

    get name() {
        return '广播';
    }
}
