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
	const liveData = await fetch(`https://www.chess.com/callback/live/game/${gameId}`)
	return liveData

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
