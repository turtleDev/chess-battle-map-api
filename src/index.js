import { Router } from 'itty-router';

const RESP_HEADERS = {
	'content-type': 'application/x-chess-pgn',
	'access-control-allow-origin': '*'
}

class ChessDotComClient {
	constructor(linkUrl) {
		this.linkUrl = linkUrl;
	}
	async PGN() {
		const gameId = this.getGameId(this.linkUrl.pathname);
		if (!gameId) {
			return new Response('unable to parse gameId from link', { status: 400 })
		}
		const gameData = await fetch(`https://www.chess.com/callback/live/game/${gameId}`)
		if (!gameData.ok) {
			return new Response(`unable to fetch game data for game id: ${gameId}`)
		}
		const pgn = await this.pgnFromGameData(gameData)
		if (!pgn) {
			return new Response(`unable to locate pgn for game id: ${gameId}`, { status: 400 });
		}
		return new Response(pgn, { headers: RESP_HEADERS });
	}
	getGameId(path) {
		const match = /\/game\/live\/(.*)/.exec(path)
		if (!match) {
			return null;
		}
		return match[1];
	}
	async pgnFromGameData(gameData) {
		let { players, game } = await gameData.json();
		players = Object.values(players).map(player => player.username);
		const date = game.pgnHeaders.Date
			.split('.')
			.slice(0, 2)
			.join('/');

		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			const monthlyGamesLink = `https://api.chess.com/pub/player/${player}/games/${date}`;
			let playerMonthlyGames = await fetch(monthlyGamesLink)
			if (playerMonthlyGames.ok) {
				const { games } = await playerMonthlyGames.json();
				for (let g = 0; g < games.length; g++) {
					const candidateGame = games[g];
					if (candidateGame.url.endsWith(game.id)) {
						return candidateGame.pgn;
					}
				}
			}
		}
		return null;
	}
}

class LichessClient {
	constructor(linkUrl) {
		this.linkUrl = linkUrl;
	}
	async PGN() {
		const gameId = this.linkUrl.pathname.replace('/', '');
		const res = await fetch(`https://lichess.org/game/export/${gameId}`);
		if (res.ok) {
			const pgn = await res.text();
			return new Response(pgn, { headers: RESP_HEADERS });
		}
		return res;
	}
}


const router = Router();

router.get('/api/chess-battle-map/pgn', async request => {
	const url = new URL(request.url);
	const link = url.searchParams.get('link')?.trim();
	if (!link) {
		return new Response('missing query parameter: link', {
			status: 400,
		})
	}
	const linkUrl = new URL(link);
	switch (linkUrl.host) {
		case 'www.chess.com':
			return await new ChessDotComClient(linkUrl).PGN();
		case 'lichess.org':
			return await new LichessClient(linkUrl).PGN();
		default:
			return new Response(`unsupported host: ${linkUrl.host}`)
	}
});

export default {
	async fetch(request) {
		return router.handle(request);
	}
};
