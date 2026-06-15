// --- Module-level variables (scoped to this module) ---
let playlist = JSON.parse(localStorage.getItem('ytPlaylist')) || [];
let currentIndex = 0;
let player;
let playerReady = false;
let playerPlaceholder; // Cache placeholder reference



// --- Utility Functions ---

function updatePlaylistCount() {
  const countElement = document.getElementById('playlistCount');
  if (countElement) {
    countElement.textContent = playlist.length;
  }
}

function updateExportButtonVisibility() {
    const exportBtn = document.getElementById('exportPlaylistBtn');
    if (exportBtn) {
        if (playlist.length > 0) {
            exportBtn.classList.remove('d-none');
        } else {
            exportBtn.classList.add('d-none');
        }
    }
}

function savePlaylistToLocalStorage() {
  try {
    localStorage.setItem('ytPlaylist', JSON.stringify(playlist));
  } catch (e) {
    console.error('Failed to save playlist to localStorage:', e);
  }
}

function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  // Handle direct video ID
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  // Handle various YouTube URL formats
  const patterns = [
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];

  for (let pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// --- Simplified Player Functions ---

// Load YouTube API (FIXED: Removed extra space in src)
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  // FIXED: Removed the trailing space
  tag.src = "https://www.youtube.com/iframe_api"; // <-- CORRECTED LINE
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// YouTube IFrame API Ready
function onYouTubeIframeAPIReady() {
  playerReady = true;
  console.log("YouTube IFrame API is ready.");
  if (playlist.length > 0 && !player) {
    createPlayer(playlist[0].id);
  }
}

// Initialize Player (Simplified)
function initializePlayer(videoId) {
   loadYouTubeAPI(); // Always ensure API is loading/loaded

   // If player already exists, just load the video
   if (player && playerReady) {
       console.log("Loading video in existing player:", videoId);
       player.loadVideoById(videoId);
       return Promise.resolve(); // Return resolved promise if player is ready
   }

   // If player is not ready, wait a bit and try again, or create if ready
   return new Promise((resolve, reject) => {
        const checkReady = setInterval(() => {
             if (playerReady) {
                 clearInterval(checkReady);
                 if (player) {
                     // Player object exists but wasn't ready, load video
                     console.log("Loading video in now-ready existing player:", videoId);
                     player.loadVideoById(videoId);
                     resolve();
                 } else {
                     // Player object doesn't exist, create it
                     console.log("Creating new player for video:", videoId);
                     createPlayer(videoId);
                     // Resolution will happen in onPlayerReady
                 }
             }
        }, 100); // Check every 100ms

        // Fallback timeout to prevent infinite loop (though unlikely)
        setTimeout(() => {
             clearInterval(checkReady);
             if (!playerReady) {
                 console.warn("Timeout waiting for YouTube API. Attempting to create player anyway if YT is defined.");
                 if (window.YT) {
                      onYouTubeIframeAPIReady(); // Force ready state
                      if (!player) {
                          createPlayer(videoId);
                          // Resolution will happen in onPlayerReady
                      } else {
                          player.loadVideoById(videoId);
                          resolve();
                      }
                 } else {
                     reject(new Error("YouTube API failed to load"));
                 }
             } else {
                 // API ready, but player creation might still be pending resolution in onPlayerReady
                 // We'll assume it resolves eventually.
                 // A more robust solution might involve resolving from onPlayerReady.
                 resolve();
             }
        }, 5000); // 5 second timeout
   });
}


// Create Player (Simplified)
function createPlayer(videoId) {
  // Ensure the player div is clear before creating a new instance
  const playerElement = document.getElementById('player');
  if (playerElement) {
      playerElement.innerHTML = ''; // Clear any potential previous content
  } else {
      console.error("Player element with ID 'player' not found.");
      return; // Critical error, cannot proceed
  }

  // Hide placeholder when creating player
  if (playerPlaceholder) {
      playerPlaceholder.classList.add('hidden');
  }

  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: {
      'autoplay': 1,
      'controls': 1,
      'showinfo': 0, // Deprecated, but doesn't hurt
      'modestbranding': 1,
      'rel': 0,
      'iv_load_policy': 3, // Disable annotations
      'playsinline': 1 // play inline on iOS
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
  console.log("YT.Player object created.");
}

// On Player Ready
function onPlayerReady(event) {
  console.log("Player is ready and playing/loaded.");
  // Update UI only if playlist has items
  if (playlist.length > 0) {
    // The video loaded might be the one in currentIndex, or the one passed to createPlayer
    // Let's ensure the UI reflects the currently intended video
    const videoToLoad = playlist[currentIndex] ? playlist[currentIndex].id : playlist[0].id;
    // Update UI for the current video (might be redundant if it's already correct, but safe)
    updateVideoInfo(videoToLoad);
    renderPlaylist(); // Might need to update 'playing' state
  }
}

// On Player State Change
function onPlayerStateChange(event) {
  // Video ended
  if (event.data === YT.PlayerState.ENDED) {
    playNextVideo();
  }
}

// On Player Error
function onPlayerError(event) {
  console.log('Player Error (Code: ' + event.data + '):', event);
  // Mark video as error and try next
  markVideoAsError(currentIndex, event.data);
  setTimeout(playNextVideo, 1000); // Delay before trying next
}

// Play Next Video
function playNextVideo() {
    if (playlist.length === 0) return;

    let nextIndex = currentIndex + 1;

    // Skip over error videos
    while (nextIndex < playlist.length && playlist[nextIndex].hasError) {
        nextIndex++;
    }

    if (nextIndex < playlist.length) {
        playVideoAtIndex(nextIndex);
    } else {
        // No more videos
        const videoInfoElement = document.getElementById('videoInfo');
        if (videoInfoElement) {
            videoInfoElement.innerHTML = '<strong class="text-warning">Playlist finished</strong>';
            videoInfoElement.className = 'video-info d-none';
        }
    }
}

// Play Video At Index
function playVideoAtIndex(index) {
    // Guard clause: Do nothing if playlist is empty or index is invalid
    if (playlist.length === 0 || index < 0 || index >= playlist.length || playlist[index].hasError) {
        return;
    }

    const videoId = playlist[index].id;
    currentIndex = index;

    // Use the simplified initializePlayer which handles ready/creation logic
    initializePlayer(videoId)
        .then(() => {
            console.log("Player initialized or video loaded for index:", index);
            // Note: UI updates (updateVideoInfo, renderPlaylist) will happen in onPlayerReady
            // or immediately if player is already ready and just loads the video.
            // However, let's also trigger UI updates here for immediate feedback
            // This is safe because initializePlayer handles the player interaction.
            updateVideoInfo(videoId);
            renderPlaylist(); // Update 'playing' state in UI
            savePlaylistToLocalStorage();
        })
        .catch(err => {
            console.error("Failed to initialize player for video at index:", index, err);
            // Even if player fails, update UI to reflect attempt
            updateVideoInfo(videoId);
            renderPlaylist();
            savePlaylistToLocalStorage();
        });
}


// --- UI Functions ---

function updateVideoInfo(videoId) {
    // Guard clause
    if (playlist.length === 0) return;

    const currentVideo = playlist[currentIndex];
    const displayTitle = currentVideo ? (currentVideo.title || `Video ${currentIndex + 1}`) : 'Unknown';
    const currentVideoInfoElement = document.getElementById('currentVideoInfo');
    const playlistPositionElement = document.getElementById('playlistPosition');
    const videoInfoElement = document.getElementById('videoInfo');

    if (currentVideoInfoElement) {
        currentVideoInfoElement.textContent = displayTitle;
    }
    if (playlistPositionElement) {
        playlistPositionElement.textContent = `${currentIndex + 1}/${playlist.length}`;
    }
    if (videoInfoElement) {
        videoInfoElement.className = 'video-info'; // Make visible
    }
}

function renderPlaylist() {
  const list = document.getElementById('playlist');
  if (!list) return;

  if (playlist.length === 0) {
    list.innerHTML = `
      <div class="empty-playlist">
        <i class="bi bi-music-note-list"></i>
        <h5>No videos yet</h5>
        <p>Add YouTube videos using the input above</p>
      </div>
    `;
    return;
  }

  list.innerHTML = '';

  playlist.forEach((video, index) => {
    const li = document.createElement('div');
    li.className = 'playlist-item';

    if (video.hasError) {
      li.classList.add('error');
      li.innerHTML = `
        <div class="playlist-item-content">
          <div class="playlist-item-icon text-danger">
            <i class="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div class="playlist-item-info">
            <div class="playlist-item-title text-danger">Playback Error</div>
            <div class="playlist-item-subtitle">ID: ${video.id}</div>
          </div>
          <div class="playlist-item-actions">
            <button class="btn btn-danger btn-sm remove-video-btn" data-index="${index}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      if (index === currentIndex) {
        li.classList.add('playing');
      }

      // Determine title to display (truncated in CSS)
      let displayTitle = video.title || `Video ${index + 1}`;
      let titleClass = video.titleLoaded ? "playlist-item-title" : "playlist-item-title video-title-loading";

      li.innerHTML = `
        <div class="playlist-item-content play-video-btn" data-index="${index}" style="cursor: pointer;">
          <div class="playlist-item-icon" style="color: ${index === currentIndex ? '#ff0000' : '#666'};">
            <i class="bi bi-play-circle-fill"></i>
          </div>
          <div class="playlist-item-info">
            <div class="${titleClass}" title="${displayTitle}">${displayTitle}</div>
            <div class="playlist-item-subtitle">ID: ${video.id}</div>
          </div>
          <div class="playlist-item-actions">
            <button class="btn btn-danger btn-sm remove-video-btn" data-index="${index}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    }

    list.appendChild(li);
  });

  // --- CRITICAL: Re-attach event listeners after re-rendering ---
  attachPlaylistEventListeners();
  console.log("DEBUG: Playlist re-rendered and event listeners re-attached.");
  // --- END CRITICAL ---
}

function attachPlaylistEventListeners() {
    // Use event delegation for playlist items
    const playlistContent = document.querySelector('.playlist-content');
    if (playlistContent) {
        playlistContent.removeEventListener('click', handlePlaylistClick); // Remove old listener if any
        playlistContent.addEventListener('click', handlePlaylistClick);
        console.log("DEBUG: Playlist event listener attached/reattached.");
    } else {
        console.warn("WARNING: Could not find .playlist-content to attach listener.");
    }
}

// --- COMPLETELY REWRITTEN handlePlaylistClick for maximum robustness and debugging ---
function handlePlaylistClick(event) {
    console.log("DEBUG: Global playlist container clicked. Event target:", event.target);

    // --- HANDLE REMOVE BUTTON CLICK ---
    // Check if the clicked element OR any of its parents has the class 'remove-video-btn'
    const removeBtn = event.target.closest('.remove-video-btn');
    if (removeBtn) {
        console.log("DEBUG: Remove button identified via closest():", removeBtn);
        event.stopPropagation(); // Stop the event from bubbling up (prevents play action)
        const indexAttr = removeBtn.dataset.index; // Use dataset for cleaner access
        console.log("DEBUG: Index attribute from button dataset:", indexAttr);
        const index = parseInt(indexAttr, 10);
        if (!isNaN(index)) {
            console.log("SUCCESS: Removing video at index:", index);
            removeVideo(index);
        } else {
            console.error("ERROR: Could not parse index for removal. Attribute value:", indexAttr);
            alert("Sorry, there was an error removing that video.");
        }
        return; // Stop processing after handling remove
    }

    // --- HANDLE PLAY ITEM CLICK (the main area) ---
    // Check if the clicked element OR any of its parents has the class 'play-video-btn'
    const playArea = event.target.closest('.play-video-btn');
    if (playArea) {
        console.log("DEBUG: Play area identified via closest():", playArea);
        const indexAttr = playArea.dataset.index; // Use dataset
        console.log("DEBUG: Index attribute from play area dataset:", indexAttr);
        const index = parseInt(indexAttr, 10);
        if (!isNaN(index)) {
            console.log("SUCCESS: Playing video at index:", index);
            playVideoAtIndex(index);
        } else {
            console.error("ERROR: Could not parse index for playing. Attribute value:", indexAttr);
            // Don't alert here as it might interfere with button clicks
        }
        return; // Stop processing after handling play
    }

    // --- HANDLE CLICKS ON OTHER PARTS OF THE PLAYLIST ITEM (Optional Debug Info) ---
    // If neither the remove button nor the main play area was clicked directly,
    // but the click was somewhere else inside a playlist item.
    const playlistItem = event.target.closest('.playlist-item');
    if (playlistItem) {
        console.log("DEBUG: Clicked inside a playlist item but not on a recognized interactive element.");
        console.log("       Click target was:", event.target);
        console.log("       Playlist item was:", playlistItem);
        // Do nothing specific, but log for debugging unexpected clicks
    }
}
// --- END REWRITTEN ---


function addVideo() {
  const inputElement = document.getElementById('videoUrl');
  if (!inputElement) return;

  const input = inputElement.value.trim();
  if (!input) return;

  const videoId = extractVideoId(input);
  if (videoId) {
    // Check if video already exists in playlist
    if (playlist.some(video => video.id === videoId)) {
      alert("This video is already in your playlist!");
      return;
    }

    // Add video with placeholder title
    const newVideo = {
      id: videoId,
      hasError: false,
      errorCode: null,
      title: `Video ${playlist.length + 1}`, // Placeholder title
      titleLoaded: false
    };

    playlist.push(newVideo);
    savePlaylistToLocalStorage();
    updatePlaylistCount();
    updateExportButtonVisibility();
    renderPlaylist();

    // Try to fetch the title for this video
    fetchVideoTitle(newVideo, playlist.length - 1);

    // --- Key Fix: Hide placeholder immediately when adding first video ---
    if (playlist.length === 1) {
        if (playerPlaceholder) {
            playerPlaceholder.classList.add('hidden');
        }
        initializePlayer(videoId);
        // onPlayerReady will update UI
    } else if (player && playerReady) {
         // If player exists and is ready, load the newly added video
         player.loadVideoById(videoId);
         currentIndex = playlist.length - 1; // Point to the last added video
         updateVideoInfo(videoId);
         renderPlaylist();
    }
    // --- End Key Fix ---

    inputElement.value = '';
  } else {
    alert("Please enter a valid YouTube URL or Video ID");
  }
}

function removeVideo(index) {
  if (index < 0 || index >= playlist.length) return;
  console.log("EXECUTING: removeVideo called for index:", index);

  playlist.splice(index, 1);
  savePlaylistToLocalStorage();
  updatePlaylistCount();
  updateExportButtonVisibility();

  // Adjust current index if needed
  if (currentIndex >= playlist.length) {
    currentIndex = Math.max(0, playlist.length - 1);
  } else if (currentIndex > index) {
     currentIndex--;
  }

  renderPlaylist();

  // Play next available video or handle empty playlist
  if (playlist.length > 0) {
    if (index === currentIndex || index === currentIndex + 1) {
        let nextPlayableIndex = currentIndex;
        while (nextPlayableIndex < playlist.length && playlist[nextPlayableIndex].hasError) {
          nextPlayableIndex++;
        }

        if (nextPlayableIndex < playlist.length) {
          playVideoAtIndex(nextPlayableIndex);
        } else {
            nextPlayableIndex = currentIndex - 1;
            while (nextPlayableIndex >= 0 && playlist[nextPlayableIndex].hasError) {
                nextPlayableIndex--;
            }
            if (nextPlayableIndex >= 0) {
                playVideoAtIndex(nextPlayableIndex);
            } else {
                // No playable videos left in the list
                if (player) {
                  try {
                    player.stopVideo();
                  } catch(e) {
                    console.log("Player might not be ready to stop.");
                  }
                }
                const videoInfoElement = document.getElementById('videoInfo');
                if (videoInfoElement) {
                    videoInfoElement.className = 'video-info d-none';
                }
                // Show placeholder again when playlist is empty after removal
                if (playerPlaceholder) {
                    playerPlaceholder.classList.remove('hidden');
                }
            }
        }
    }
    // If the removed video wasn't the current one playing, UI still needs update
    // renderPlaylist() above handles this.
  } else {
    // Playlist is now empty, clear player content/state
    if (player) {
      try {
        player.stopVideo();
        console.log("Stopped video in player.");
      } catch (e) {
        console.log("Could not stop video, player might not be fully ready or video not playing.");
      }
    }
    const videoInfoElement = document.getElementById('videoInfo');
    if (videoInfoElement) {
        videoInfoElement.className = 'video-info d-none';
    }
    const inputElement = document.getElementById('videoUrl');
    if (inputElement) {
        inputElement.value = '';
    }
    updateExportButtonVisibility(); // Ensure export button hides
    // Show placeholder again when playlist becomes empty
    if (playerPlaceholder) {
        playerPlaceholder.classList.remove('hidden');
    }
  }
}

function markVideoAsError(index, errorCode) {
  if (playlist[index]) {
    playlist[index].hasError = true;
    playlist[index].errorCode = errorCode;
    savePlaylistToLocalStorage();
    renderPlaylist();
  }
}

// --- Import/Export Functions ---

function exportPlaylist() {
    if (playlist.length === 0) {
        alert("Playlist is empty. Nothing to export.");
        return;
    }

    const dataStr = JSON.stringify(playlist, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ad_free_player_playlist.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importPlaylistFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) {
                 alert("Invalid playlist file format.");
                 return;
            }

            let addedCount = 0;
            let duplicateCount = 0;

            // Merge logic: Add new videos, skip duplicates
            importedData.forEach(importedVideo => {
                const exists = playlist.some(existingVideo => existingVideo.id === importedVideo.id);
                if (!exists) {
                    // Basic validation could be added here if needed
                    playlist.push(importedVideo);
                    addedCount++;
                } else {
                    duplicateCount++;
                }
            });

            if (addedCount > 0) {
                savePlaylistToLocalStorage();
                updatePlaylistCount();
                updateExportButtonVisibility();
                renderPlaylist();

                // --- Key Fix: Use simpler player logic for import ---
                // Ensure placeholder is hidden when importing
                if (playerPlaceholder) {
                    playerPlaceholder.classList.add('hidden');
                }

                // If videos were added, initialize player for the first one
                // This should make the UI responsive immediately.
                if (playlist.length > 0) {
                     initializePlayer(playlist[0].id)
                         .then(() => {
                             console.log("Player initialized after import.");
                             // Update UI to reflect the first video is loaded/playing
                             updateVideoInfo(playlist[0].id);
                             renderPlaylist(); // Ensure 'playing' state is shown
                         })
                         .catch(err => {
                             console.error("Failed to initialize player after import:", err);
                             // Even if player fails, UI (playlist) is updated
                             updateVideoInfo(playlist[0].id);
                             renderPlaylist();
                         });
                }
                // --- End Key Fix ---

                alert(`Playlist imported successfully! Added ${addedCount} new videos. Skipped ${duplicateCount} duplicates.`);
            } else {
                alert(`No new videos were added. Skipped ${duplicateCount} duplicates.`);
            }

        } catch (error) {
            console.error("Error parsing imported file:", error);
            alert("Error reading the file. Please make sure it's a valid JSON playlist file.");
        }
    };
    reader.readAsText(file);
}


// --- Fetch Titles ---

function fetchVideoTitle(video, index) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video.id}&format=json`;

  fetch(oEmbedUrl)
    .then(response => response.json()) // Simplified, assuming JSON or failure
    .then(data => {
      if (data && data.title) {
        video.title = data.title;
        video.titleLoaded = true;
        savePlaylistToLocalStorage();
        renderPlaylist();
      }
    })
    .catch(error => {
      console.log(`Could not fetch title for video ${video.id}:`, error);
      // Keep the placeholder title
    });
}

function fetchPlaylistTitles() {
  playlist.forEach((video, index) => {
    if (!video.titleLoaded && !video.hasError) {
      // Add a small delay between requests to avoid overwhelming the server
      setTimeout(() => {
        fetchVideoTitle(video, index);
      }, index * 500); // Stagger requests
    }
  });
}


// --- Initialization and Event Listeners ---

function init() {
    console.log("DEBUG: Initializing app...");
    // Set current year in footer
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Cache placeholder reference
    playerPlaceholder = document.getElementById('player-placeholder');

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
          .then(function(registration) {
            console.log('SW registered: ', registration);
          })
          .catch(function(registrationError) {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Load playlist on startup
    updatePlaylistCount();
    updateExportButtonVisibility();
    renderPlaylist(); // This will also call attachPlaylistEventListeners
    if (playlist.length > 0) {
        initializePlayer(playlist[0].id);
        // onPlayerReady will update UI
        // Hide placeholder if playlist is not empty on load
        if (playerPlaceholder) {
            playerPlaceholder.classList.add('hidden');
        }
    } else {
        // Ensure placeholder is visible if playlist is empty on load
        if (playerPlaceholder) {
            playerPlaceholder.classList.remove('hidden');
        }
    }
    fetchPlaylistTitles(); // Start fetching titles in background

    // --- Attach Event Listeners ---

    // Import Button
    const importBtn = document.getElementById('importPlaylistBtn');
    const importFileInput = document.getElementById('importFileInput');
    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                importPlaylistFromFile(file);
                // Reset input value to allow selecting the same file again
                event.target.value = '';
            }
        });
    }

    // Export Button
    const exportBtn = document.getElementById('exportPlaylistBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPlaylist);
    }

    // Clear Button
    const clearBtn = document.getElementById('clearPlaylistBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
             if (playlist.length === 0) return;
             if (confirm('Are you sure you want to clear the entire playlist?')) {
                playlist = [];
                currentIndex = 0;
                savePlaylistToLocalStorage();
                updatePlaylistCount();
                updateExportButtonVisibility();
                renderPlaylist();

                // --- Key Fix: Clear player state and show placeholder ---
                if (player) {
                  try {
                    player.stopVideo();
                    player.destroy(); // Properly destroy the player instance
                    player = null; // Clear reference
                    playerReady = false; // Reset ready state
                    console.log("Destroyed player instance during clear.");
                  } catch(e) {
                    console.log("Could not stop/destroy player during clear:", e);
                  }
                }
                const videoInfoElement = document.getElementById('videoInfo');
                if (videoInfoElement) {
                    videoInfoElement.className = 'video-info d-none';
                }
                const inputElement = document.getElementById('videoUrl');
                if (inputElement) {
                    inputElement.value = '';
                }
                updateExportButtonVisibility(); // Ensure export button hides
                // Show placeholder again after clearing
                if (playerPlaceholder) {
                    playerPlaceholder.classList.remove('hidden');
                }
                // --- End Key Fix ---
             }
        });
    }

    // Add Video Button and Input
    const addVideoBtn = document.getElementById('addVideoBtn');
    const videoUrlInput = document.getElementById('videoUrl');
    if (addVideoBtn) {
        addVideoBtn.addEventListener('click', addVideo);
    }
    if (videoUrlInput) {
        videoUrlInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            addVideo();
          }
        });
    }

    // Initial attachment of playlist event listeners (redundant as renderPlaylist does it, but safe)
    attachPlaylistEventListeners();
    console.log("DEBUG: Initial event listeners attached.");

    console.log('Ad Free Player - PWA with Import/Export (Delete Button Fix Applied)');
}

// Start the app when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM is already loaded
    init();
}

// Expose YT callback globally as it's called by the YouTube API script
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;