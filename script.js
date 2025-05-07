// Define the elements
const iframe = document.getElementById('videoFrame');
const title = document.getElementById('title');
const server_buttons = document.querySelectorAll('.server-grid button');
const nextEpButton = document.getElementById('nextep-button');
const epSelectButton = document.querySelector('.epselect-button');
const popoverContainer = document.querySelector('.popover-container');
const popoverContent = document.querySelector('.popover-content');
const seasonsList = document.querySelector('.seasons-list');
const episodesList = document.querySelector('.episodes-list');
const popoverTitle = document.querySelector('.popover-header-title');
const popoverBackButton = document.querySelector('.popover-back-button');
const popoverCloseButton = document.querySelector('.popover-close-button');
const popoverListContainer = document.querySelector('.popover-list-container');

// Ad-blocking and pop-up prevention
function setupAdBlocking() {
    // Create a style element to hide ad-related elements
    const adBlockStyle = document.createElement('style');
    adBlockStyle.innerHTML = `
        /* Common ad selectors */
        [id*="ad"], [class*="ad"], [id*="popup"], [class*="popup"], 
        [id*="banner"], [class*="banner"], [id*="overlay"], [class*="overlay"],
        iframe:not(#videoFrame) {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(adBlockStyle);

    // Block new windows/pop-ups
    const originalOpen = window.open;
    window.open = function() {
        console.log('Pop-up blocked');
        return null;
    };

    // Handle iframe security
    iframe.addEventListener('load', function() {
        try {
            // Add sandbox to limit iframe capabilities
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
            
            // Attempt to inject ad-blocking into iframe content
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const adBlockIframeStyle = document.createElement('style');
            adBlockIframeStyle.innerHTML = adBlockStyle.innerHTML;
            iframeDoc.head.appendChild(adBlockIframeStyle);
        } catch(e) {
            // Cannot access iframe content due to same-origin policy - expected for cross-origin content
            console.log('Cannot modify iframe content due to security restrictions');
        }
    });
}

// Utility Functions
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const id = params.get('id');
    const server = params.get('server'); // Get the optional server parameter
    const tmdbId = params.get('tmdbId');

    const result = {};

    // Add server to the result if it exists
    if (server) {
        result.server = server;
    }

    if (type === 'movie' && id) {
        result.type = 'movie';
        result.id = id;
        result.tmdbId = tmdbId;
    } else if (type === 'tv' && id && params.get('s') && params.get('e')) {
        result.type = 'tv';
        result.id = id;
        result.tmdbId = tmdbId;
        result.season = params.get('s');
        result.episode = params.get('e');
    } else {
        return null; // Return null if required parameters are missing
    }

    return result;
}

function getSelectedServerButtonId() {
    // Loop through the buttons to find the one with the 'selected' class
    for (const button of server_buttons) {
        if (button.classList.contains('selected')) {
            const id = button.id.replace('server', '');
            return parseInt(id, 10); // Convert the extracted string to a number
        }
    }

    return null; // Return null if no button is selected
}

function changeServer(serverNumber) {
    const params = getURLParams();
    if (!params) return;

    iframe.src = '';

    let src = '';
    if (params.type === 'movie') {
        switch (serverNumber) {
            case 1:
                src = `https://vidora.su/movie/${params.tmdbId}`;
                break; // Vidora
            case 2:
                src = `https://moviesapi.club/movie/${params.tmdbId}`;
                break; // Zephyr
            case 3:
                src = `https://vidsrc.me/embed/movie?tmdb=${params.tmdbId}`;
                break; // Nyx
            case 4:
                src = `https://player.videasy.net/movie/${params.tmdbId}`;
                break; // Orion
            case 5:
                src = `https://vidsrc.su/embed/movie/${params.tmdbId}`;
                break; // Luna
            case 6:
                src = `https://vidlink.pro/movie/${params.tmdbId}?title=true&poster=true&autoplay=false`;
                break; // Nova
            case 7:
                src = `https://vidsrc.cc/v3/embed/movie/${params.tmdbId}?autoPlay=false`;
                break; // Aether
        }
    } else if (params.type === 'tv') {
        switch (serverNumber) {
            case 1:
                src = `https://vidora.su/tv/${params.tmdbId}/${params.season}/${params.episode}`;
                break; // Vidora
            case 2:
                src = `https://moviesapi.club/tv/${params.tmdbId}-${params.season}-${params.episode}`;
                break; // Zephyr
            case 3:
                src = `https://vidsrc.me/embed/tv?tmdb=${params.tmdbId}&season=${params.season}&episode=${params.episode}`;
                break; // Nyx
            case 4:
                src = `https://player.videasy.net/tv/${params.tmdbId}/${params.season}/${params.episode}?nextEpisode=true&episodeSelector=true`;
                break; // Orion
            case 5:
                src = `https://vidsrc.su/embed/tv/${params.tmdbId}/${params.season}/${params.episode}`;
                break; // Luna
            case 6:
                src = `https://vidlink.pro/tv/${params.tmdbId}/${params.season}/${params.episode}?title=true&poster=true&autoplay=false&nextbutton=true`;
                break; // Nova
            case 7:
                src = `https://vidsrc.cc/v3/embed/tv/${params.tmdbId}/${params.season}/${params.episode}?autoPlay=false`;
                break; // Aether
        }
    }

    // Apply anti-popup wrapper
    src = applyAdBlockParams(src);
    iframe.src = src;

    // Highlight the selected server button
    server_buttons.forEach((button) => button.classList.remove('selected'));
    document.getElementById(`server${serverNumber}`).classList.add('selected');
}

// Helper function to add anti-ad parameters to URLs when possible
function applyAdBlockParams(url) {
    // For services that support it, add parameters to disable ads
    const parsedUrl = new URL(url);
    
    // Some services support noads or similar parameters
    if (url.includes('vidsrc.me') || url.includes('vidsrc.su') || url.includes('vidsrc.cc')) {
        parsedUrl.searchParams.append('block_popups', 'true');
        parsedUrl.searchParams.append('no_ads', 'true');
    }
    
    if (url.includes('vidlink.pro')) {
        parsedUrl.searchParams.append('popup', 'false');
    }
    
    return parsedUrl.toString();
}

async function fetchTMDBData(params) {
    const result = {};

    try {
        let url;
        const headers = {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZmU4Njk2YjNjN2YyYTQ0OTlkNGU4YjAxYjIzZjU5OSIsIm5iZiI6MTc0NDMxNzkxMy44MjUsInN1YiI6IjY3ZjgyZGQ5MzE3NzUyNzZkNmQ5YmFkOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GhKyngSEyOqNcHx05UeTy5KrGGibkm4aC1u1TV0Db4U`,
            'accept': 'application/json',
        };

        if (params.type === 'movie') {
            url = `https://api.themoviedb.org/3/movie/${params.tmdbId}?language=en-US`;
            const response = await fetch(url, { method: 'GET', headers: headers });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            result['title'] = data.original_title;
        } else if (params.type === 'tv') {
            url = `https://api.themoviedb.org/3/tv/${params.tmdbId}?language=en-US`;
            const response = await fetch(url, { method: 'GET', headers: headers });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            result.title = data.name;
            const seasons = data.seasons;
            result.seasons = [];
            for (const season of seasons) {
                result[season.season_number] = season.episode_count;
                // Exclude Season 0 (Specials) from the list
                if (season.season_number !== 0) {
                    result.seasons.push(season.season_number);
                }
            }
        } else {
            throw new Error('Invalid type specified');
        }
        return result;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error if you want the caller to handle it
    }
}

function getNextEp(currentSeason, currentEpisode, tmdbData) {
    const currentSeasonEps = tmdbData[currentSeason];
    if (currentEpisode < currentSeasonEps) {
        return [parseInt(currentSeason), parseInt(currentEpisode) + 1];
    }
    const nextSeasonEps = tmdbData[parseInt(currentSeason) + 1];
    if (nextSeasonEps !== undefined) {
        return [parseInt(currentSeason) + 1, 1];
    }
    return [null, null];
}

// Fetch TV show episodes data from TMDB API
async function fetchEpSelectionData(params, tmdbData) {
    const result = {};
    let url;
    const headers = {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZmU4Njk2YjNjN2YyYTQ0OTlkNGU4YjAxYjIzZjU5OSIsIm5iZiI6MTc0NDMxNzkxMy44MjUsInN1YiI6IjY3ZjgyZGQ5MzE3NzUyNzZkNmQ5YmFkOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GhKyngSEyOqNcHx05UeTy5KrGGibkm4aC1u1TV0Db4U`,
        'accept': 'application/json',
    };

    for (const season of tmdbData.seasons) {
        url = `https://api.themoviedb.org/3/tv/${params.tmdbId}/season/${season}?language=en-US`;
        const response = await fetch(url, { method: 'GET', headers: headers });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const seasonData = await response.json();

        result[season] = {};
        result[season].name = seasonData.name;
        result[season].air_date = seasonData.air_date;
        result[season].poster_path = seasonData.poster_path;
        result[season].episodes = [];

        for (const ep of seasonData.episodes) {
            const episode = {};
            episode.name = ep.name;
            episode.episode_number = ep.episode_number;
            episode.season_number = ep.season_number;
            episode.air_date = ep.air_date;
            episode.runtime = ep.runtime;
            episode.still_path = ep.still_path;
            result[season].episodes.push(episode);
        }
    }
    return result;
}

// Episode Selection Popover show: seasons list
function showSeasons(tvShowTitle) {
    seasonsList.style.display = 'block';
    episodesList.style.display = 'none';
    popoverBackButton.style.display = 'none';
    popoverTitle.innerText = tvShowTitle;
    popoverListContainer.scrollTop = 0;
}

// Episode Selection Popover show: episodes list
function showEpisodes(seasonName) {
    seasonsList.style.display = 'none';
    episodesList.style.display = 'block';
    popoverBackButton.style.display = 'block';
    popoverTitle.innerText = seasonName;
    popoverListContainer.scrollTop = 0;
}

// Load Popover container with seasons and episodes
async function loadPopoverSelectEpisode(params, tmdbData) {
    // Get episode data
    const epSelectionData = await fetchEpSelectionData(params, tmdbData);

    // Populate seasons list
    seasonsList.innerHTML = tmdbData.seasons
        .map(
            (season) => `
        <li data-season="${season}">
            <div class="season-name">${epSelectionData[season].name}</div>
            <div class="season-details">${epSelectionData[season].air_date ? epSelectionData[season].air_date : ''}</div>
        </li>
    `
        )
        .join('');

    // Handle season click
    seasonsList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            const season = li.getAttribute('data-season');
            const episodes = epSelectionData[season].episodes;
            episodesList.innerHTML = episodes
                .map(
                    (ep) => `
                <li data-season="${season}" data-episode="${ep.episode_number}">
                    <div class="episode-name">E${ep.episode_number} - ${ep.name}</div>
                    <div class="episode-details">${ep.air_date ? ep.air_date : ''}&nbsp;&nbsp;&nbsp;${ep.runtime ? `(${ep.runtime}m)` : ''}</div>
                </li>
            `
                )
                .join('');
            showEpisodes(epSelectionData[season].name);
        }
    });

    // Handle episode click
    episodesList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            const season = li.getAttribute('data-season');
            const episode = li.getAttribute('data-episode');
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('s', season);
            currentUrl.searchParams.set('e', episode);
            currentUrl.searchParams.set('server', getSelectedServerButtonId());
            window.location.href = currentUrl.toString();
        }
    });
    showSeasons(tmdbData.title);
}

// Initialize popover data
window.onload = async () => {
    // Setup ad-blocking features first
    setupAdBlocking();
    
    const params = getURLParams();
    // if (!params) {
    //     window.location.href = 'https://github.com/NandhuSathish/free_watch_imdb?tab=readme-ov-file';
    //     return;
    // }

    try {
        const tmdbData = await fetchTMDBData(params);

        title.addEventListener('click', () => {
            window.location.href = `https://www.themoviedb.org/${params.type}/${params.tmdbId}`;
        });

        if (params.type === 'movie') {
            title.innerText = `${tmdbData.title}`;
        } else {
            title.innerText = `${tmdbData.title} S${params.season} E${params.episode}`;

            // Next Episode
            const [nextEpS, nextEpE] = getNextEp(params.season, params.episode, tmdbData);
            if (nextEpS !== null) {
                nextEpButton.title = `Next Episode: S${nextEpS} E${nextEpE}`;
                nextEpButton.style.display = 'flex';
                nextEpButton.style.cursor = 'pointer';
                nextEpButton.style.visibility = 'visible';
                nextEpButton.disabled = false;
                nextEpButton.addEventListener('click', () => {
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.set('s', nextEpS);
                    currentUrl.searchParams.set('e', nextEpE);
                    currentUrl.searchParams.set('server', getSelectedServerButtonId());
                    window.location.href = currentUrl.toString();
                });
            } else {
                nextEpButton.title = `No Next Episode`;
                nextEpButton.style.display = 'flex';
                nextEpButton.style.visibility = 'visible';
                nextEpButton.disabled = true;
            }

            // Episode Selection
            epSelectButton.style.display = 'flex';
            epSelectButton.style.cursor = 'pointer';
            epSelectButton.style.visibility = 'visible';
            epSelectButton.disabled = false;
            // Open popover in current season when clicking the button
            epSelectButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentSeasonLi = seasonsList.querySelector(`li[data-season="${params.season}"]`);
                if (currentSeasonLi) {
                    currentSeasonLi.click();
                }
                popoverContainer.classList.toggle('active');
            });
            // Close popover when clicking outside
            document.addEventListener('click', (e) => {
                if (!popoverContainer.contains(e.target)) {
                    popoverContainer.classList.remove('active');
                    showSeasons(tmdbData.title);
                }
            });
            // Show seasons list when click Back Button
            popoverBackButton.addEventListener('click', (e) => {
                showSeasons(tmdbData.title);
            });
            loadPopoverSelectEpisode(params, tmdbData); // dont await to not block the page load
        }
    } catch (error) {
        console.error('Error loading data:', error);
        title.innerText = 'Title';
    }

    if (params.server) {
        changeServer(parseInt(params.server));
    } else {
        changeServer(1);
    }
};

// Additional defensive measures against ads
document.addEventListener('DOMContentLoaded', function() {
    // Prevent creation of new elements that might be ads
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const element = node;
                        // Check if it might be an ad
                        if ((element.id && (element.id.includes('ad') || element.id.includes('popup'))) ||
                            (element.className && (element.className.includes('ad') || element.className.includes('popup'))) ||
                            element.tagName === 'IFRAME' && element.id !== 'videoFrame') {
                            // Remove potential ad elements
                            element.remove();
                        }
                    }
                });
            }
        });
    });

    // Start observing the document body for added nodes
    observer.observe(document.body, { childList: true, subtree: true });
});
