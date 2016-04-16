var createSongRow = function(songNumber, songName, songLength) {
    var template = 
        '<tr class="album-view-song-item">'
      + '  <td class="song-item-number" data-song-number="' + songNumber + '">' + songNumber + '</td>'
      + '  <td class="song-item-title">' + songName + '</td>'
      + '  <td class="song-item-duration">' + filterTimeCode(songLength) + '</td>'
      + '</tr>'
      ;
    var $row = $(template);
    
    var clickHandler = function() {
        var songNumber = parseInt($(this).attr('data-song-number'));

        if (currentlyPlayingSongNumber !== null) {
            // Revert to song number for currently playing song because user started playing new song.
            var currentlyPlayingCell = $getSongNumberCell(currentlyPlayingSongNumber);
            currentlyPlayingCell.html(currentlyPlayingSongNumber);
            
        }
        if (currentlyPlayingSongNumber !== songNumber) {
            // Switch from Play -> Pause button to indicate new song is playing.
            setSong(songNumber);
            currentSoundFile.play();
            updateSeekBarWhileSongPlays();
            
            var $volumeFill = $('.volume .fill');
            var $volumeThumb = $('.volume .thumb');
            $volumeFill.width(currentVolume + '%');
            $volumeThumb.css({left: currentVolume + '%'});
            
            $(this).html(pauseButtonTemplate);
            updatePlayerBarSong();
        } else if (currentlyPlayingSongNumber === songNumber) {
            if (currentSoundFile.isPaused()) {
                $(this).html(pauseButtonTemplate);
                $('.main-controls .play-pause').html(playerBarPauseButton);
                currentSoundFile.play();
                updateSeekBarWhileSongPlays();
            } else {
                $(this).html(playButtonTemplate);
                $('.main-controls .play-pause').html(playerBarPlayButton);
                currentSoundFile.pause();
            }
            
        }
    };
    
    var onHover = function(event) {
        var songNumberCell = $(this).find('.song-item-number');
        var songNumber = parseInt(songNumberCell.attr('data-song-number'));
        
        if(songNumber !== currentlyPlayingSongNumber) {
            songNumberCell.html(playButtonTemplate);
        }
    };
    
    var offHover = function(event) {
        var songNumberCell = $(this).find('.song-item-number');
        var songNumber = parseInt(songNumberCell.attr('data-song-number'));
        
        if(songNumber !== currentlyPlayingSongNumber) {
            songNumberCell.html(songNumber);
        }
        console.log("songNumber type is " + typeof songNumber + "\n and currentlyPlayingSongNumber type is " + typeof currentlyPlayingSongNumber);
    };
    
    $row.find('.song-item-number').click(clickHandler);
    $row.hover(onHover, offHover);
    return $row;
};

var setCurrentAlbum = function(album) {
    currentAlbum = album;
    var $albumTitle = $('.album-view-title');
    var $albumArtist = $('.album-view-artist');
    var $albumReleaseInfo = $('.album-view-release-info');
    var $albumImage = $('.album-cover-art');
    var $albumSongList = $('.album-view-song-list');

    
    $albumTitle.text(album.title);
    $albumArtist.text(album.artist);
    $albumReleaseInfo.text(album.year + ' ' + album.label);
    $albumImage.attr('src', album.albumArtUrl);
    
    $albumSongList.empty();
    
    for (var i = 0; i < album.songs.length; i++) {
        var $newRow = createSongRow(i + 1, album.songs[i].title, album.songs[i].duration);
        $albumSongList.append($newRow);
    }
};

var filterTimeCode = function(timeInSeconds) {
    if (timeInSeconds < 10) {
        return "0:0" + parseFloat(Math.floor(timeInSeconds));
    } else if (timeInSeconds < 60) {
        return "0:" + parseFloat(Math.floor(timeInSeconds));
    } else {
        var minutes = parseFloat(Math.floor(timeInSeconds / 60));
        var seconds = parseFloat(Math.floor(timeInSeconds % (minutes * 60)));
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        return minutes + ":" + seconds;  
    }
};

var setCurrentTimeInPlayerBar = function() {
    if (currentSoundFile) {
        var currentTime = filterTimeCode(currentSoundFile.getTime());
        $('.current-time').text(currentTime);
    }
};

var updateSeekBarWhileSongPlays = function() {
  if (currentSoundFile)   {
      currentSoundFile.bind('timeupdate', function(event) {
          var remainingTime = this.getDuration() - this.getTime();
          var done = remainingTime == 0;
          var seekBarFillRatio = this.getTime() / this.getDuration();
          var $seekBar = $('.seek-control .seek-bar');
          
          if(done) {
              nextSong();
          };
          updateSeekPercentage($seekBar, seekBarFillRatio);
          setCurrentTimeInPlayerBar();
      });
  }
};

var updateSeekPercentage = function($seekBar, seekBarFillRatio) {
    var offsetXPercent = seekBarFillRatio * 100;
    
    offsetXPercent = Math.max(0, offsetXPercent);
    offsetXPercent = Math.min(100, offsetXPercent);
    
    var percentageString = offsetXPercent + '%';
    $seekBar.find('.fill').width(percentageString);
    $seekBar.find('.thumb').css({left: percentageString});
};

var setupSeekBars = function() {
    var $seekBars = $('.player-bar .seek-bar');
    
    $seekBars.click(function(event) {
        var offsetX = event.pageX - $(this).offset().left;
        var barWidth = $(this).width();
        var seekBarFillRatio = offsetX / barWidth;
        
        if ($(this).parent().attr('class') == 'seek-control') {
            if (!currentSoundFile) {
                return;
            }
            seek(seekBarFillRatio * currentSoundFile.getDuration());
        } else {
            setVolume(seekBarFillRatio * 100);
        }
        
        updateSeekPercentage($(this), seekBarFillRatio);
    });
    
    $seekBars.find('.thumb').mousedown(function(event) {
        var $seekBar = $(this).parent();
        
        $(document).bind('mousemove.thumb', function(event) {
            var offsetX = event.pageX - $seekBar.offset().left;
            var barWidth = $seekBar.width();
            var seekBarFillRatio = offsetX / barWidth;
            
        if ($seekBar.parent().attr('class') == 'seek-control') {
            seek(seekBarFillRatio * currentSoundFile.getDuration());
        } else {
            setVolume(seekBarFillRatio);
        }
            
            updateSeekPercentage($seekBar, seekBarFillRatio);
        });
        
        $(document).bind('mouseup.thumb', function() {
            $(document).unbind('mousemove.thumb');
            $(document).unbind('mouseup.thumb');
        });
    });
};

var trackIndex = function(album, song) {
    return album.songs.indexOf(song);
};

var lastSongStatePaused = false;

var nextSong = function() {
    //know what previous song is
    var getLastSongNumber = function(index) {
        return index == 0 ? currentAlbum.songs.length : index;
    };
    
    var currentSongIndex = trackIndex(currentAlbum, currentSongFromAlbum);
    currentSongIndex++;
    
    if (currentSongIndex >= currentAlbum.songs.length) {
        currentSongIndex = 0;
    }    
    
    if (currentSoundFile.isEnded() || !currentSoundFile.isPaused()) {
        lastSongStatePaused = false;
    } else {
        lastSongStatePaused = true;
    };
    
    // set new current song
    setSong(currentSongIndex + 1);

    // update player bar
    updatePlayerBarSong();
    
    var lastSongNumber = getLastSongNumber(currentSongIndex);
    var $nextSongNumberCell = $getSongNumberCell(currentlyPlayingSongNumber);
    var $lastSongNumberCell = $getSongNumberCell(lastSongNumber);
    
    if (lastSongStatePaused) {
        currentSoundFile.pause();
        $nextSongNumberCell.html(playButtonTemplate);
        $('.main-controls .play-pause').html(playerBarPlayButton);
    } else {
        currentSoundFile.play();
        updateSeekBarWhileSongPlays();
        $nextSongNumberCell.html(pauseButtonTemplate);
    };
    
    $lastSongNumberCell.html(lastSongNumber);
};

var previousSong = function() {
    var getLastSongNumber = function(index) {
        return index == (currentAlbum.songs.length - 1) ? 1 : index + 2;
    };
    
    var currentSongIndex = trackIndex(currentAlbum, currentSongFromAlbum);
    currentSongIndex--;
    
    if (currentSongIndex < 0) {
        currentSongIndex = currentAlbum.songs.length - 1;
    }
    
    if(currentSoundFile.isPaused()) {
        lastSongStatePaused = true;
    } else {
        lastSongStatePaused = false;
    };
    
    // set new current song
    setSong(currentSongIndex + 1);
    
    // update player bar
    updatePlayerBarSong();
    
    var lastSongNumber = getLastSongNumber(currentSongIndex);
    var $nextSongNumberCell = $getSongNumberCell(currentlyPlayingSongNumber);
    var $lastSongNumberCell = $getSongNumberCell(lastSongNumber);
    
    currentSoundFile.play();
    updateSeekBarWhileSongPlays();
    
    if (lastSongStatePaused) {
        currentSoundFile.pause();
        $nextSongNumberCell.html(playButtonTemplate);
        $('.main-controls .play-pause').html(playerBarPlayButton);
    } else {
        currentSoundFile.play();
        updateSeekBarWhileSongPlays();
        $nextSongNumberCell.html(pauseButtonTemplate);
    };
    
    $lastSongNumberCell.html(lastSongNumber);
};

var setTotalTimeInPlayerBar = function() {
    if (!currentSongFromAlbum) {
        $('.total-time').text(filterTimeCode(albumPicasso.songs[0].duration));
    } else {
        $('.total-time').text(filterTimeCode(currentSongFromAlbum.duration));
    };
};

var updatePlayerBarSong = function() {
  if (!currentSongFromAlbum) {
      $('.currently-playing .song-name').text(albumPicasso.songs[0].title);
      $('.currently-playing .artist-name').text(albumPicasso.artist);
      $('.currently playing .artist-song-mobile').text(albumPicasso.songs[0].title + " - " + albumPicasso.artist);
      $('.main-controls .play-pause').html(playerBarPlayButton);
      setTotalTimeInPlayerBar();
  } else {
      $('.currently-playing .song-name').text(currentSongFromAlbum.title);  
      $('.currently-playing .artist-name').text(currentAlbum.artist);
      $('.currently playing .artist-song-mobile').text(currentSongFromAlbum.title + " - " + currentAlbum.artist);
      $('.main-controls .play-pause').html(playerBarPauseButton);
      setTotalTimeInPlayerBar(); 
  };
};

var playButtonTemplate = '<a class="album-song-button"><span class="ion-play"></span></a>';
var pauseButtonTemplate = '<a class="album-song-button"><span class="ion-pause"></span></a>';
var playerBarPlayButton = '<span class="ion-play"></span>';
var playerBarPauseButton = '<span class="ion-pause"></span>';

var togglePlayFromPlayerBar = function() {
    var currentlyPlayingCell = $getSongNumberCell(currentlyPlayingSongNumber);
    //if no song is currently playing, player bar should play 1st song when clicked
    if (!currentSoundFile) {
        setSong(1);
        $('.song-item-number[data-song-number="' + 1 + '"]').html(pauseButtonTemplate);
        $('.main-controls .play-pause').html(playerBarPauseButton);
        currentSoundFile.play();
        updateSeekBarWhileSongPlays();
    } else if (currentSoundFile.isPaused()) {
        currentlyPlayingCell.html(pauseButtonTemplate);
        $('.main-controls .play-pause').html(playerBarPauseButton);
        currentSoundFile.play();
    } else {
        currentlyPlayingCell.html(playButtonTemplate);
        $('.main-controls .play-pause').html(playerBarPlayButton);
        currentSoundFile.pause();
    };
};

// store state of playing songs
var currentAlbum = null;
var currentlyPlayingSongNumber = null;
var currentSongFromAlbum = null;
var currentSoundFile = null;
var currentVolume = 80;

var $previousButton = $('.main-controls .previous');
var $nextButton = $('.main-controls .next');
var $playerBarPlayPauseButton = $('.main-controls .play-pause');

var setSong = function(songNumber) {
    if (currentSoundFile) {
        currentSoundFile.stop();
    }
    
    if (songNumber === null) {
        currentlyPlayingSongNumber = null;
        currentSongFromAlbum = null;
    } else {
        currentlyPlayingSongNumber = parseInt(songNumber);
        currentSongFromAlbum = currentAlbum.songs[songNumber - 1];
    }
    currentSoundFile = new buzz.sound(currentSongFromAlbum.audioUrl, {
        formats: [ 'mp3'],
        preload: true
    });
    
    setVolume(currentVolume);
};

var seek = function(time) {
    if (currentSoundFile) {
        currentSoundFile.setTime(time);
    };
}

var setVolume = function(volume) {
    if (currentSoundFile) {
        currentSoundFile.setVolume(volume);
        var $volumeFill = $('.volume .fill');
        var $volumeThumb = $('.volume .thumb');
        $volumeFill.width(currentVolume + '%');
        $volumeThumb.css({left: currentVolume + '%'});
    }
};

var $getSongNumberCell = function(number) {
    return $('.song-item-number[data-song-number="' + number + '"]');
};

$(document).ready(function() {
    setCurrentAlbum(albumPicasso);
    $previousButton.click(previousSong);
    $nextButton.click(nextSong);
    setupSeekBars();
    $playerBarPlayPauseButton.click(togglePlayFromPlayerBar);
    updatePlayerBarSong();
});