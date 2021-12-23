"use strict";

const { ServiceBroker } = require("moleculer");
const AgendaMixin = require("../");
const broker = new ServiceBroker();

broker.createService({
	name: "agendaMixin",
	mixins: [AgendaMixin({ db: { address: process.env.AGENDA_MONGO_URI } }, {})],
});

broker.start();
