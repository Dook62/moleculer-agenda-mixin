/*
 * moleculer-awesome
 * Copyright (c) 2021 Alexander (https://github.com/masfree/moleculer-awesome)
 * MIT Licensed
 */

"use strict";

const Agenda = require("agenda");

module.exports = (agendaParams = {}, options = { initOnStart: true, events: {} }) => ({
	name: "moleculer-agenda-mixin",

	events: options.events || {},

	/**
	 * Actions
	 */
	actions: {
		agendaCancel: {
			params: {
				name: "string"
			},
			async handler({ params }) {
				const { name } = params;
				return this.agenda.cancel({ name });
			}
		},
		agendaDisable: {
			params: {
				name: "string"
			},
			async handler({ params }) {
				const { name } = params;
				return this.agenda.disable({ name });
			}
		},
		agendaEnable: {
			params: {
				name: "string"
			},
			async handler({ params }) {
				const { name } = params;
				return this.agenda.enable({ name });
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		async agendaStart() {
			const agenda = new Agenda(agendaParams);
			this.agenda = agenda;
			await this.agenda.start();
			Object.entries(this.jobs || {}).forEach(([name, cb]) => {
				this.agenda.define(name, cb);
			});
			await this.broker.emit("agenda.started");
		},
		async agendaStop() {
			this.agenda && (await this.agenda.stop());
			await this.broker.emit("agenda.stopped");
		}
	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {
		if (options.initOnStart) return this.agendaStart();
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {
		return this.agendaStop();
	}
});
