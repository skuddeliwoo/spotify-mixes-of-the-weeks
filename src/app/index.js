const express = require('express')
const path = require('path')

const app = express();
const port = 3001;

app.use(express.static(path.resolve(__dirname, 'public')))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html')
})

app.get('/login', (req, res) => {
	const clientId = '57ae3c5aa90a4cd1a56af19f82fc5657'
	const scopes = 'playlist-modify-private playlist-modify-public playlist-read-private playlist-read-collaborative'
	const redirect_uri = 'http://' + req.hostname + ':' + port + '/playlists.html'
	// TODO: change 'http://' to actual used protocol of express
	res.redirect('https://accounts.spotify.com/authorize'
		+ '?response_type=token'
		+ '&client_id=' + clientId
		+ '&scope=' + encodeURIComponent(scopes)
		+ '&redirect_uri=' + encodeURIComponent(redirect_uri)
		)
});

app.listen(port, () => {
	console.log('listening on port ' + port)
})
