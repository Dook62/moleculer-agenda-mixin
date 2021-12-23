
[![Coverage Status](https://coveralls.io/repos/github/ROKY-ROCKS/moleculer-agenda-mixin/badge.svg?branch=main)](https://coveralls.io/github/ROKY-ROCKS/moleculer-agenda-mixin?branch=main)
[![Known Vulnerabilities](https://snyk.io/test/github/ROKY-ROCKS/moleculer-agenda-mixin/badge.svg)](https://snyk.io/test/github/ROKY-ROCKS/moleculer-agenda-mixin)

# moleculer-agenda-mixin  [![NPM version](https://img.shields.io/npm/v/moleculer-agenda-mixin.svg)](https://www.npmjs.com/package/moleculer-agenda-mixin)

The [Agenda](https://www.npmjs.com/package/agenda) Mixin for Moleculer.

## Install

```sh
npm install moleculer-agenda-mixin --save
```

## Usage

```js
const date = require('date.js');
const AgendaMixin = require('../index');

// Options to config agenda mixin
options = {
  // initOnStart: true - starts the agenda after starting the service
  initOnStart: false,
  // if initOnStart: false - then you need to connect the agenda to the events of your application
  // it helps when you have scheduled tasks that can start immediately after starting and they
  // are dependent on other parts of the application
  events: {
    'services.started': {
      async handler() {
        await this.agendaStart();
      },
    },
    // and stop if your need it
    'services.stopped': {
      async handler() {
        await this.agendaStop();
      },
    },
  }
};

module.exports = {
  name: 'workers',
  version: 1,
  // The first is the agenda options the second is the mixin options
  mixins: [AgendaMixin({ db: { address: process.env.AGENDA_MONGO_URI } }, options)],
  events: {
    'agenda.started': {
      async handler() {
        await this.agenda.cancel({ name: 'checkPayments' });
        await this.agenda.schedule('everyday at 10:00', 'checkPayments');
      },
    },
  },
  actions: {
    checkPayments: {
      async handler(ctx) {
        const timeNow = new Date();
        const dayAgo = date('1 day ago');
        await ctx.call('v1.payments.tryToPay', {
          query: { nextPay: { $gte: dayAgo, $lte: timeNow }, active: true }
        });
      },
    },
    payEnd: {
      params: {
        id: 'any',
      },
      async handler(ctx) {
        const { id } = ctx.params;
        // In action services, you can use a clean agenda to schedule jobs
        this.agenda.schedule('1 day', 'payEnd', { id });
      },
    },
  },
  created() {
    // all tasks in this list after the "agendaStart" method are defined as available agenda tasks
    this.jobs = {
      checkPayments: async (_job) => {
        this.broker.call('v1.workers.checkPayments', {});
      },
      payEnd: async (job) => {
        // In action services, you can use a clean agenda to schedule jobs
        const { id } = job.attrs.data;
        this.broker.call('v1.notifications.payEnd', { id });
      },
    };
  },
};
```

For more information on use, refer to the [Agenda documentation](https://github.com/agenda/agenda).


## License
The project is available under the [MIT license](https://tldrlegal.com/license/mit-license).
