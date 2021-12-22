const Agenda = require('agenda')
const events = require('events')
const { ServiceBroker } = require('moleculer')
const { MoleculerError } = require('moleculer').Errors

const AgendaMixin = require('../../src')

jest.mock('agenda')

describe('Test Agenda Mixin', () => {
  const eventEmitter = new events.EventEmitter()
  eventEmitter.setMaxListeners(0)
  const errorMessage = 'errorTest'
  const error = new Error(errorMessage)
  const sampleJobObject = {}
  const validJob = new RegExp('^validJob')

  const mockDisableEnable = jest.fn()
  .mockImplementation((query) => {
    if (typeof query.name !== 'undefined' && query.name === 'validJob') {
      return Promise.resolve(1)
    }
    return Promise.resolve(0)
  })
  const agendaMock = {
    on: jest.fn().mockImplementation((name, handler) => eventEmitter.on(name, handler)),
    once: jest.fn().mockImplementation((name, handler) => eventEmitter.once(name, handler)),
    start: jest.fn(),
    stop: jest.fn(),
    define: jest.fn(),
    schedule: jest.fn().mockImplementation((when, name) => {
      if (validJob.test(name)) {
        return Promise.resolve(sampleJobObject);
      }
      return Promise.reject(error);
    }),
    every: jest.fn().mockImplementation((when, name) => {
      if (validJob.test(name)) {
        return Promise.resolve(sampleJobObject)
      }
      return Promise.reject(error)
    }),
    now: jest.fn()
    .mockImplementation((name) => {
      if (name === 'validJob') {
        return Promise.resolve(sampleJobObject)
      }
      return Promise.reject(error)
    }),
    disable: mockDisableEnable,
    enable: mockDisableEnable,
  }
  Agenda.mockImplementation(() => agendaMock)

  const broker = new ServiceBroker({ logger: false })

  // Make sure that log get mocked.
  const fakeLog = {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  }
  jest.spyOn(broker, 'getLogger').mockImplementation(() => fakeLog)

  beforeEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    eventEmitter.removeAllListeners()
  })

  describe('Agenda', () => {
    it('should be started and stopped properly', async () => {
      const service = broker.createService(AgendaMixin());
      await broker.start();
      expect(agendaMock.start).toHaveBeenCalled();
      await broker.stop();
      expect(agendaMock.stop).toHaveBeenCalled();
      broker.destroyService(service);
    });
  })

  describe('Agenda when { initOnStart: false }', () => {
    const options = {
      initOnStart: false,
      events: {
        'services.started': {
          async handler() {
            await this.agendaStart()
          },
        },
        'services.stopped': {
          async handler() {
            await this.agendaStop()
          },
        },
      }
    }

    it('should not to be started without service events', async () => {
      const service = broker.createService(AgendaMixin({}, options))
      await broker.start()
      expect(agendaMock.start).not.toHaveBeenCalled()
      await broker.stop()
      expect(agendaMock.stop).not.toHaveBeenCalled()
      broker.destroyService(service)
    })

    it('should be started or stopped after correct service event  emit', async () => {
      const service = broker.createService(AgendaMixin({}, options))
      await broker.start()
      await broker.emit('started')
      expect(agendaMock.start).not.toHaveBeenCalled()
      await broker.emit('services.started')
      expect(agendaMock.start).toHaveBeenCalled()
      await broker.emit('services.stopped')
      expect(agendaMock.stop).toHaveBeenCalled()
      await broker.stop()
      broker.destroyService(service)
    })
  })

  describe('Jobs', () => {
    it('should define job correctly', async () => {
      const defineJobs = {
        testJob1: () => {},
        testJob2: () => {}
      }
      const defineAgendaService = {
        name: 'testDefine',
        mixins: [AgendaMixin()],
        created() {
          this.jobs = defineJobs
        },
      }
      broker.createService(defineAgendaService)
      await broker.start()
      expect(agendaMock.define)
      .toHaveBeenNthCalledWith(1, 'testJob1', defineJobs['testJob1'])
      expect(agendaMock.define)
      .toHaveBeenNthCalledWith(2, 'testJob2',  defineJobs['testJob2'])
      await broker.stop()
    })
  })
})
