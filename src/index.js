import {Router} from 'itty-router';

const getGameId = path => {
	const match = /\/game\/live\/(.*)/.exec(path)
	if (!match) {
		return null;
	}
	return match[1];
};

const getChessDotComPGN = async (linkUrl) => {
	const gameId = getGameId(linkUrl.pathname);
	if (!gameId) {
		return new Response('unable to parse gameId from link', {status: 400})
	}
	const gameData = await fetch(`https://www.chess.com/callback/live/game/${gameId}`)
	if (!gameData.ok) {
		return new Response(`unable to fetch game data for game id: ${gameId}`)
	}
	const game = await gameData.json();
	const players = Object.values(game.players).map(player => player.username);
	const date = game.game.pgnHeaders.Date.split('.').slice(0, 2).join('/')
	for (let i = 0; i < players.length; i++) {
		const player = players[i];
		const monthlyGamesLink = `https://api.chess.com/pub/player/${player}/games/${date}`;
		let playerMonthlyGames = await fetch(monthlyGamesLink)
		if (playerMonthlyGames.ok) {
			const { games } = await playerMonthlyGames.json();
			for (let g = 0; g < games.length; g++) {
				if (games[g].url.endsWith(gameId)) {
					return new Response(games[g].pgn, {
						headers: {
							"content-type": "application/x-chess-pgn"
						}
					});
				}
			}
		}
	}
	return new Response(`unable to locate pgn for game id: ${gameId}`, { status: 400 });
};

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
			return await getChessDotComPGN(linkUrl)
		default:
			return new Response(`unsupported host: ${linkUrl.host}`)
	}
});

export default {
	async fetch(request) {
		return router.handle(request);
	}
};
