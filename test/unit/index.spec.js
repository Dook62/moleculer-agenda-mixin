const Agenda = require("agenda");
const events = require("events");
const { ServiceBroker } = require("moleculer");

const AgendaMixin = require("../../src");

jest.mock("agenda");

describe("Test Agenda Mixin", () => {
	const eventEmitter = new events.EventEmitter();
	eventEmitter.setMaxListeners(0);
	const errorMessage = "errorTest";
	const error = new Error(errorMessage);
	const sampleJobObject = {};
	const validJob = new RegExp("^validJob");

	const mockDisableEnable = jest.fn().mockImplementation(query => {
		if (query.name === "validJob") {
			return Promise.resolve(1);
		}
		return Promise.resolve(0);
	});
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
				return Promise.resolve(sampleJobObject);
			}
			return Promise.reject(error);
		}),
		now: jest.fn().mockImplementation(name => {
			if (name === "validJob") {
				return Promise.resolve(sampleJobObject);
			}
			return Promise.reject(error);
		}),
		disable: mockDisableEnable,
		enable: mockDisableEnable,
		cancel: mockDisableEnable
	};
	Agenda.mockImplementation(() => agendaMock);

	const broker = new ServiceBroker({ logger: false });

	// Make sure that log get mocked.
	const fakeLog = {
		debug: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn()
	};
	jest.spyOn(broker, "getLogger").mockImplementation(() => fakeLog);

	beforeEach(() => {
		jest.clearAllMocks();
	});
	afterAll(() => {
		eventEmitter.removeAllListeners();
	});

	describe("Agenda", () => {
		const options = {
			initOnStart: true
		};

		it("should be started and stopped properly", async () => {
			const service = broker.createService(AgendaMixin({}, options));
			await broker.start();
			expect(agendaMock.start).toHaveBeenCalled();
			await broker.stop();
			expect(agendaMock.stop).toHaveBeenCalled();
			broker.destroyService(service);
		});
	});

	describe("Agenda when { initOnStart: false }", () => {
		const options = {
			initOnStart: false,
			events: {
				"services.started": {
					async handler() {
						await this.agendaStart();
					}
				},
				"services.stopped": {
					async handler() {
						await this.agendaStop();
					}
				}
			}
		};

		it("should not to be started without service events", async () => {
			const service = broker.createService(AgendaMixin({}, options));
			await broker.start();
			expect(agendaMock.start).not.toHaveBeenCalled();
			await broker.stop();
			expect(agendaMock.stop).not.toHaveBeenCalled();
			broker.destroyService(service);
		});

		it("should be started or stopped after correct service event emit", async () => {
			const service = broker.createService(AgendaMixin({}, options));
			await broker.start();
			await broker.emit("started");
			expect(agendaMock.start).not.toHaveBeenCalled();
			await broker.emit("services.started");
			expect(agendaMock.start).toHaveBeenCalled();
			await broker.emit("services.stopped");
			expect(agendaMock.stop).toHaveBeenCalled();
			await broker.stop();
			broker.destroyService(service);
		});
	});

	describe("Jobs", () => {
		it("should define job correctly", async () => {
			const defineJobs = {
				testJob1: () => {},
				testJob2: () => {}
			};
			const defineAgendaService = {
				name: "testDefine",
				mixins: [AgendaMixin()],
				created() {
					this.jobs = defineJobs;
				}
			};
			broker.createService(defineAgendaService);
			await broker.start();
			expect(agendaMock.define).toHaveBeenNthCalledWith(
				1,
				"testJob1",
				defineJobs["testJob1"]
			);
			expect(agendaMock.define).toHaveBeenNthCalledWith(
				2,
				"testJob2",
				defineJobs["testJob2"]
			);
			await broker.stop();
		});
	});

	describe("agendaCancel", () => {
		it("should call agenda.disable", async () => {
			const disableJobService = {
				name: "testCancel",
				mixins: [AgendaMixin()],
				jobs: {
					validJob: {
						handler: () => {}
					}
				}
			};
			const service = broker.createService(disableJobService);
			await broker.start();

			const result1 = await broker.call("testCancel.agendaCancel", { name: "validJob" });
			const result2 = await broker.call("testCancel.agendaCancel", { name: "anyJob" });

			expect(agendaMock.cancel).toHaveBeenNthCalledWith(1, { name: "validJob" });
			expect(result1).toBe(1);
			expect(agendaMock.cancel).toHaveBeenNthCalledWith(2, { name: "anyJob" });
			expect(result2).toBe(0);
			await broker.stop();
			broker.destroyService(service);
		});
	});

	describe("agendaDisable", () => {
		it("should call agenda.disable", async () => {
			const disableJobService = {
				name: "testDisable",
				mixins: [AgendaMixin()],
				jobs: {
					validJob: {
						handler: () => {}
					}
				}
			};
			const service = broker.createService(disableJobService);
			await broker.start();

			const result1 = await broker.call("testDisable.agendaDisable", { name: "validJob" });
			const result2 = await broker.call("testDisable.agendaDisable", { name: "anyJob" });

			expect(agendaMock.disable).toHaveBeenNthCalledWith(1, { name: "validJob" });
			expect(result1).toBe(1);
			expect(agendaMock.disable).toHaveBeenNthCalledWith(2, { name: "anyJob" });
			expect(result2).toBe(0);
			await broker.stop();
			broker.destroyService(service);
		});
	});

	describe("agendaEnable", () => {
		it("should call agenda.enable", async () => {
			const disableJobService = {
				name: "testEnable",
				mixins: [AgendaMixin()],
				jobs: {
					validJob: {
						handler: () => {}
					}
				}
			};
			const service = broker.createService(disableJobService);
			await broker.start();

			const result1 = await broker.call("testEnable.agendaEnable", { name: "validJob" });
			const result2 = await broker.call("testEnable.agendaEnable", { name: "anyJob" });

			expect(agendaMock.enable).toHaveBeenNthCalledWith(1, { name: "validJob" });
			expect(result1).toBe(1);
			expect(agendaMock.enable).toHaveBeenNthCalledWith(2, { name: "anyJob" });
			expect(result2).toBe(0);
			await broker.stop();
			broker.destroyService(service);
		});
	});
});
