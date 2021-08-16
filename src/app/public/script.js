if (document.readyState == 'loading') {
	document.onreadystatechange = function () {
		if (document.readyState == 'interactive') {
			app();
		}
	}
} else {
	app();
}

function app() {
	const token = window.location.href.split('=')[1]
	const headers = new Headers({
		'Authorization': 'Bearer ' + token,
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'Accept-Language': 'en'
	})

	function get(url) {
		return fetch(url, {
			headers: headers
		})
	}

	function post(url, body = undefined) {
		return fetch(url, {
			method: 'POST',
			headers: headers,
			body: body
		})
	}

	// TODO: err handling 401 token expired

	// TODO: object sorting: playlist name asc, tracks track_number asc

	const saveButton = document.querySelector('#saveButton');
	const statusText = document.querySelector('#statusText');

	const findWeeklyMix = async () => {
		try {
			let weeklyMix;

			let playlistBatchRes = await get(`https://api.spotify.com/v1/me/playlists`)
			let playlistBatch = await playlistBatchRes.json()

			if (playlistBatch.error) throw playlistBatch.error

			playlistBatch.items.map((playlist) => {
					console.log(playlist.name)
				if (playlist.name == "Discover Weekly") weeklyMix = playlist
			})

			while (!weeklyMix && playlistBatch.next) {
				playlistBatchRes = await get(playlistBatch.next)
				playlistBatch = await playlistBatchRes.json()

				playlistBatch.items.map((playlist) => {
					console.log(playlist.name)
					if (playlist.name == "Discover Weekly") weeklyMix = playlist
				})
			}

			if (!weeklyMix) throw Error('No playlist found with name "Discover Weekly"')

			return weeklyMix
		} catch (error) {
			if (error.status && error.status === 401) {
				alert(`looks like your authorization token has expired. You'll be redirected, then you can try again.`)
				window.location.replace("login")
			}
			alert('Sorry, we were unable to find your Discover Weekly playlist: ' + error)
		}
	}

	const handlePlaylist = async (playlist) => {
		let playlistMapped = {
			name: playlist.name,
			trackCount: playlist.tracks.total,
			tracks: []
		}

		playlistMapped = await fetchPlaylistTracks(playlistMapped, playlist.tracks.href)

		return playlistMapped;
	}

	const fetchPlaylistTracks = async (playlistMapped, url) => {
		return get(url)
			.then(res => res.json())
			.then(async res => {
				await res.items.map((track) => {
					playlistMapped.tracks.push({
						name: track.track.name,
						duration_ms: track.track.duration_ms,
						artists: track.track.artists.map(artist => {
							return {
								name: artist.name,
								id: artist.id
							}
						}),
						album: {
							name: track.track.album.name,
							id: track.track.album.id
						},
						track_number: track.track.track_number,
						id: track.track.id
					})
				})
				if (res.next) {
					return await fetchPlaylistTracks(playlistMapped, res.next)
				} else {
					return playlistMapped
				}
			})
	}

	const saveWeeklyMix = async (mappedWeeklyMix) => {
		const createRes = await post(`https://api.spotify.com/v1/me/playlists`, JSON.stringify({
			name: generateName(),
			public: false,
			description: 'Automatically Saved Discover Weekly Playlist via API integration'
		}))

		const createdPlaylist = await createRes.json()

		const uris = mappedWeeklyMix.tracks.reduce((prev = '', curr, currI, arr) => {
			return (typeof prev === 'string' ? prev : `spotify:track:${prev.id},`) + `spotify:track:${curr.id},`
		})

		const pushRes = await post(`https://api.spotify.com/v1/playlists/${createdPlaylist.id}/tracks?uris=${encodeURIComponent(uris)}`)

		return pushRes
	}

	const generateName = () => {
		return 'MixOfTheWeek_' + new Date().getFullYear() % 100 + '_' + ISO8601_week()
	}

	const ISO8601_week = () => {
		const dt = new Date()
		var tdt = new Date(dt.valueOf());
		var dayn = (dt.getDay() + 6) % 7;
		tdt.setDate(tdt.getDate() - dayn + 3);
		var firstThursday = tdt.valueOf();
		tdt.setMonth(0, 1);
		if (tdt.getDay() !== 4) {
			tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
		}
		return 1 + Math.ceil((firstThursday - tdt) / 604800000);
	}

	saveButton.onclick = async () => {
		saveButton.classList.add('clicked')
		statusText.textContent = 'Working on it...'
		const weeklyMix = await findWeeklyMix()
		const mappedWeeklyMix = await handlePlaylist(weeklyMix)

		res = await saveWeeklyMix(mappedWeeklyMix)

		if (res && res.statusText == 'Created') {
			console.log('success');
			statusText.textContent = 'Great success! Your saved playlist should appear under the name ' + generateName()
		}
	}
}
