const { unstable_dev } = require("wrangler");
const { Chess } = require('chess.js');
const TIMEOUT_MS = 15000;

describe("Worker", () => {
	let worker;

	beforeAll(async () => {
		worker = await unstable_dev("src/index.js", {
			experimental: { disableExperimentalWarning: true },
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it("can get PGN of a chess.com game", async () => {
		const link = 'https://www.chess.com/game/live/76613632263';
		const resp  = await worker.fetch(`http://localhost/api/chess-battle-map/pgn?link=${encodeURIComponent(link)}`);
		if (resp) {
			expect(resp.headers.get('content-type')).toEqual('application/x-chess-pgn')
			let text = await resp.text();
			expect(text).toContain('[White "bitbanger"]')

			// verify that response is parse-able PGN
			const c = new Chess();
			c.loadPgn(text)
		} else {
			throw Error("didn't get a response from worker")
		}
	}, TIMEOUT_MS);

	it("can get PGN of a lichess.org game", async () => {
		const link = 'https://lichess.org/pBZ2tIFy';
		const resp  = await worker.fetch(`http://localhost/api/chess-battle-map/pgn?link=${encodeURIComponent(link)}`);
		if (resp) {
			expect(resp.headers.get('content-type')).toEqual('application/x-chess-pgn')
			let text = await resp.text();
			expect(text).toContain('[Black "bitbanger"]')

			const c = new Chess();
			c.loadPgn(text)
		} else {
			throw Error("didn't get a response from worker")
		}
	}, TIMEOUT_MS)
});
