const Agenda = require('agenda')

module.exports = (agendaParams = {}, options = { initOnStart: true, events: {} }) => ({
  name: 'agenda-mixin',
  events: options.events || {},
  actions: {
    agendaCancel: {
      params: {
        name: 'string',
      },
      async handler({ params }) {
        const { name } = params
        console.log(this.agenda)
        return this.agenda.cancel({ name })
      },
    },
    agendaDisable: {
      params: {
        name: 'string',
      },
      async handler({ params }) {
        const { name } = params
        return this.agenda.disable({ name })
      },
    },
    agendaEnable: {
      params: {
        name: 'string',
      },
      async handler({ params }) {
        const { name } = params
        return this.agenda.enable({ name })
      },
    },
  },
  async started() {
    if (options.initOnStart) return this.agendaStart()
  },
  async stopped() {
    return this.agendaStop()
  },
  methods: {
    async agendaStart() {
      const agenda = new Agenda(agendaParams)
      this.agenda = agenda
      await this.agenda.start()
      Object.entries(this.jobs || {}).forEach(([name, cb]) => {
        this.agenda.define(name, cb)
      })
      await this.broker.emit('agenda.started')
    },
    async agendaStop() {
      this.agenda && await this.agenda.stop()
      await this.broker.emit('agenda.stopped')
    }
  }
})
