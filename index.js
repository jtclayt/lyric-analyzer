/**
 * Name: Justin Clayton
 * Date: May 3, 2020
 * Section: CSE 154 AD
 * This is the main JavaScript document for the CP3 webpage and contains all the logic to fetch
 * requested songs from the lyrics API. It handles errors if the song can not be found or a fetch
 * error occurs and if the user tries to make repeat requests. This page also handles setting up
 * the bar chart visulisation which is continuously updated on successful requests. When a request
 * is processed a card detailing the received data is dynamically generated or updated to display
 * some information to the user.
 */
'use strict';
(function() {
  // API URL
  const BASE_URL = 'https://api.lyrics.ovh/v1';

  // d3 Global variables
  const CHART_MARGIN = {LEFT: 100, RIGHT: 10, TOP: 25, BOTTOM: 150};
  let d3 = window.d3;
  let d3Chart;
  let width, height;
  let xScale, yScale, colorScale;
  let chartData = [];

  // Webpage global variables
  const NOT_FOUND = -1;
  let artistDetails = {};

  window.addEventListener('load', init);
  window.addEventListener('resize', buildChart);

  /** Set up the page for user interaction. */
  function init() {
    buildChart();
    id('lyric-request-form').addEventListener('submit', event => {
      event.preventDefault();
      onSubmit();
    });
    id('clear-btn').addEventListener('click', onClear);
  }

  // Event Listeners
  /** Remove all artist information and clear chart */
  function onClear() {
    artistDetails = {};
    chartData = [];
    id('card-container').innerHTML = '';
    id('lyrics').innerHTML = '';
    buildChart();
  }

  /** Check the inputs and make the request when the form is submitted. */
  function onSubmit() {
    event.preventDefault();
    createMessage('success', 'Submitting request...');
    let artist = qs('input[name="artist"]').value.trim();
    let song = qs('input[name="song"]').value.trim();
    let url = `${BASE_URL}/${artist}/${song}`;
    let isRepeatRequest = checkRepeat(artist, song);

    if (isRepeatRequest) {
      createMessage('error', `${song} by ${artist} has already been requested.`);
    } else {
      fetch(url)
        .then(checkStatus)
        .then(res => res.json())
        .then(data => {
          processResponse(data, artist, song);
        })
        .catch(handleError);
    }
  }

  // Fetch helper functions
  /**
   * Add text content to an existing artistCard div.
   * @param {obejct} artistCard - The HTML div object element representing a card.
   * @param {string} artist - The artist to update the card for.
   */
  function addCardContent(artistCard, artist) {
    let title = gen('h3');
    title.textContent = artist;
    let totalUniqueWords = gen('p');
    totalUniqueWords.textContent = `Unique Words: ${artistDetails[artist].totalUniqueWords}`;
    let totalWords = gen('p');
    totalWords.textContent = `Total Words: ${artistDetails[artist].totalWords}`;
    let percentUnique = gen('p');
    percentUnique.textContent = `Percent Unique: ${artistDetails[artist].percentUnique}%`;
    artistCard.appendChild(title);
    artistCard.appendChild(totalUniqueWords);
    artistCard.appendChild(totalWords);
    artistCard.appendChild(percentUnique);
  }

  /**
   * Adds or updates artist information in the array used to format the d3 chart.
   * @param {string} artist - The artist to update chart data for.
   */
  function addChartData(artist) {
    let index = getArtistIndex(artist);
    let newData = {
      artist: artist,
      percentUnique: artistDetails[artist].percentUnique
    };
    if (index === NOT_FOUND) {
      chartData.push(newData);
    } else {
      chartData[index] = newData;
    }
    sortChartData();
  }

  /**
   * Checks whether the user has already requested the song and artist before.
   * @param {string} artist - The requested artist.
   * @param {string} song - The requested song.
   * @return {boolean} If this song has been requested.
   */
  function checkRepeat(artist, song) {
    artist = artist.toLowerCase();
    song = song.toLowerCase();
    let isRepeatRequest;

    try {
      isRepeatRequest = artistDetails[artist].requestedSongs.some(requestedSong => {
        return requestedSong === song;
      });
    } catch (error) {
      isRepeatRequest = false;
    }
    return isRepeatRequest;
  }

  /**
   * Check whether fetch returned a status of 200 OK, throw an error if not.
   * @param {object} response - The response object from the API for the GET request.
   * @returns {object} Returns the response if ok, otherwise throws error.
   */
  function checkStatus(response) {
    if (response.ok) {
      return response;
    }
    throw Error("Error in request: " + response.statusText);
  }

  /**
   * Adds the newest count to the current counts for the artist.
   * @param {object} count1 - The counts stored for the artist.
   * @param {object} count2 - The new song counts.
   */
  function combineCounts(count1, count2) {
    for (let key in count2) {
      if (count1[key]) {
        count1[key] += count2[key];
      } else {
        count1[key] = count2[key];
      }
    }
  }

  /**
   * Creates or updates the content in the details card for an artist.
   * @param {string} artist - The artist to create/update the card for.
   */
  function createCard(artist) {
    let artistCard = id(artist);

    if (artistCard) {
      artistCard.innerHTML = '';
    } else {
      artistCard = gen('div');
      artistCard.setAttribute('id', artist);
      artistCard.classList.add('card');
      id('card-container').appendChild(artistCard);
    }
    addCardContent(artistCard, artist);
  }

  /**
   * Create the artist information if it doesn't already exist.
   * @param {object} songInfo - The information on the words from the most recent request.
   */
  function createNewArtist(songInfo) {
    let numUniqueWords = Object.keys(songInfo.wordCounts).length;
    let artist = songInfo.artist;

    artistDetails[artist] = {
      requestedSongs: [songInfo.song],
      totalWords: songInfo.totalWords,
      wordCounts: songInfo.wordCounts,
      totalUniqueWords: numUniqueWords
    };
    getPercentage(artist);
  }

  /**
   * Creates a message, error or success, to display to user trying to make a song request.
   * @param {string} type - Whether message is error or success.
   * @param {string} content - The message to be displayed.
   */
  function createMessage(type, content) {
    if (id('request-message')) {
      id('request-message').remove();
    }
    let errorP = gen('p');
    errorP.textContent = content;
    errorP.setAttribute('id', 'request-message');
    errorP.classList.add(`${type}-message`);
    id('request-form-section').appendChild(errorP);
  }

  /**
   * Add current lyrics to the lyrics detail section.
   * @param {string} artist - The current displayed artist.
   * @param {string} song - The current displayed song lyrics.
   * @param {string} lyrics - The lyrics for the current song.
   */
  function displayLyrics(artist, song, lyrics) {
    id('lyrics').innerHTML = '';
    let h2Tag = gen('h2');
    h2Tag.textContent = `Artist: ${artist} Song: ${song}`;
    let pTag = gen('p');
    pTag.textContent = lyrics;
    id('lyrics').appendChild(h2Tag);
    id('lyrics').appendChild(pTag);
  }

  /**
   * Takes in the string of lyrics from the API and processes it to get individual words.
   * @param {string} lyrics - The lyrics to get words from.
   * @return {array} An array of the words in the lyrics.
   */
  function extractWords(lyrics) {
    lyrics = lyrics.toLowerCase();

    // Remove block notes and puntctuation.
    let regexPattern = /\[.*\]/;
    lyrics.replace(regexPattern, '');
    regexPattern = /[.,/#!$%^&*;:{}=_`~()?\n]/g;
    lyrics = lyrics.replace(regexPattern, ' ');

    let words = lyrics.split(' ').filter(word => {
      return word;
    });
    return words;
  }

  /**
   *
   * @param {string} artist - The artist to find the index of.
   * @return {number} The index of the artist, -1 if not found.
   */
  function getArtistIndex(artist) {
    return chartData.findIndex(element => {
      return element.artist === artist;
    });
  }

  /** Use the color scale for the d3 chart to determine the broder of each artist card. */
  function getBorderColors() {
    let cards = qsa('.card');
    cards.forEach(card => {
      card.style.borderColor = colorScale(card.id);
    });
  }

  /**
   * Recalculates the percent of words that are unique for and artist.
   * @param {string} artist - The artist to recalculate the percent unique for.
   */
  function getPercentage(artist) {
    const PERCENT = 100;
    let numUnique = artistDetails[artist].totalUniqueWords;
    let total = artistDetails[artist].totalWords;
    artistDetails[artist].percentUnique = Math.round(numUnique / total * PERCENT);
  }

  /**
   * Process the words in the array and get a count of each time the word appears.
   * @param {array} words - An aray of the words in the lyrics.
   * @returns {object} An object with keys of words found and values of the number found.
   */
  function getWordCounts(words) {
    let wordCounts = {};
    words.forEach(word => {
      if (wordCounts[word]) {
        wordCounts[word]++;
      } else {
        wordCounts[word] = 1;
      }
    });
    return wordCounts;
  }

  /**
   * Handle an error if thrown during fetch
   * @param {object} error - The error object thrown.
   */
  function handleError(error) {
    createMessage('error', error.message);
  }

  /**
   * Takes the JSON data from the API and processes the words in it, storing the data for the chart
   * and detail cards.
   * @param {object} data - JSON data returned from API.
   * @param {string} artist - Currently requested artist.
   * @param {string} song - Currently requested song.
   */
  function processResponse(data, artist, song) {
    if (data.lyrics === "Instrumental") {
      throw Error('This song has no lyrics. Please search for songs with lyrics.');
    }
    displayLyrics(artist, song, data.lyrics);
    song = song.toLowerCase();
    artist = artist.toLowerCase();
    let words = extractWords(data.lyrics);
    let songInfo = {
      artist: artist,
      song: song,
      wordCounts: getWordCounts(words),
      totalWords: words.length
    };

    if (!artistDetails[artist]) {
      createNewArtist(songInfo);
    } else {
      updateArtist(songInfo);
    }
    createCard(artist);
    addChartData(artist);
    buildChart();
    getBorderColors();
    let message = `Successfully loaded data for ${song} by ${artist}. Ready to add more songs.`;
    createMessage('success', message);
  }

  /** Sorts the chart data in descending order. */
  function sortChartData() {
    chartData.sort((element1, element2) => {
      return element2.percentUnique - element1.percentUnique;
    });
  }

  /**
   * Update the artist information.
   * @param {object} songInfo - The information on the words from the most recent request.
   */
  function updateArtist(songInfo) {
    let artist = songInfo.artist;

    artistDetails[artist].requestedSongs.push(songInfo.song);
    artistDetails[artist].totalWords += songInfo.totalWords;
    combineCounts(artistDetails[artist].wordCounts, songInfo.wordCounts);
    artistDetails[artist].totalUniqueWords = Object.keys(artistDetails[artist].wordCounts).length;
    getPercentage(artist);
  }

  // d3 functions
  /**
   * Finds size available for chart and sets up the d3 chart which is attached to the HTML figure
   * element with id chart. Then loads the available data.
   */
  function buildChart() {
    getSize();
    if (d3Chart) {
      id('chart').innerHTML = '';
    }
    d3Chart = d3.select('#chart')
      .append('svg')
      .attr('width', width + CHART_MARGIN.LEFT + CHART_MARGIN.RIGHT)
      .attr('height', height + CHART_MARGIN.TOP + CHART_MARGIN.BOTTOM)
      .append('g')
      .attr('transform', `translate(${CHART_MARGIN.LEFT}, ${CHART_MARGIN.TOP})`);

    loadData();
  }

  /** Sets up the d3 chart axes and color scale for filling bar chart. */
  function loadData() {
    xScale = getXScale();
    yScale = getYScale();
    colorScale = getColorScale();
    setXAxis();
    setYAxis();
    updateChart();
  }

  /**
   * Uses built in d3 color scale with 12 colors, maps artists to color.
   * @return {string} Hex color value from built in scale.
   */
  function getColorScale() {
    return d3.scaleOrdinal()
      .domain(chartData.map(data => {
        return data.artist;
      }))
      .range(d3.schemePaired);
  }

  /** Find the size of the parent container of the chart. */
  function getSize() {
    const WIDTH = id('chart').clientWidth;
    const HEIGHT = 600;
    width = WIDTH - CHART_MARGIN.LEFT - CHART_MARGIN.TOP;
    height = HEIGHT - CHART_MARGIN.TOP - CHART_MARGIN.BOTTOM;
  }

  /**
   * Set up a band scale which converts the current artists to a position on the x axis.
   * @return {number} Pixel position on X axis for this artist.
   */
  function getXScale() {
    const LOWER_RANGE = 0;
    const PADDING_VALUE = 0.3;

    return d3.scaleBand()
      .domain(chartData.map(data => {
        return data.artist;
      }))
      .range([LOWER_RANGE, width])
      .paddingInner(PADDING_VALUE)
      .paddingOuter(PADDING_VALUE);
  }

  /**
   * Set up a linear scale that sizes the height of the recangle based on percentage of lyrics
   * that are unique.
   * @returns {number} Pixel position representing the height of bar in chart.
   */
  function getYScale() {
    const LOWER_DOMAIN = 0;
    const UPPER_DOMAIN = 100;
    const UPPER_RANGE = 0;

    return d3.scaleLinear()
      .domain([LOWER_DOMAIN, UPPER_DOMAIN])
      .range([height, UPPER_RANGE]);
  }

  /** Make the labels and axis for the x axis. */
  function setXAxis() {
    const X_LABEL_X_OFFSET = width / 2;
    const CHART_BOTTOM_MARGIN = 125;
    const X_LABEL_Y_OFFSET = height + CHART_BOTTOM_MARGIN;
    const X_AXIS_CALL = d3.axisBottom(xScale);

    // X Axis Label
    d3Chart.append('text')
      .attr('class', 'x axis-label')
      .attr('x', X_LABEL_X_OFFSET)
      .attr('y', X_LABEL_Y_OFFSET)
      .attr('font-size', '24px')
      .attr('text-anchor', 'middle')
      .text('Artist');

    // X Axis Setup
    d3Chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)
      .call(X_AXIS_CALL)
      .selectAll('text')
      .attr('y', '10')
      .attr('x', '-5')
      .attr('font-size', '16px')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-45)');
  }

  /** Make the labels and axis for the y axis. */
  function setYAxis() {
    const Y_LABEL_X_OFFSET = -height / 2;
    const Y_LABEL_Y_OFFSET = -80;
    const TICK_COUNT = 10;
    const Y_AXIS_CALL = d3.axisLeft(yScale)
      .ticks(TICK_COUNT)
      .tickFormat(data => {
        return data + '%';
      });

    // Y Axis Label
    d3Chart.append('text')
      .attr('class', 'y axis-label')
      .attr('x', Y_LABEL_X_OFFSET)
      .attr('y', Y_LABEL_Y_OFFSET)
      .attr('font-size', '24px')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text('Percent of Lyrics Unique (%)');

    // Y Axis Setup
    d3Chart.append('g')
      .attr('class', 'y-axis')
      .call(Y_AXIS_CALL)
      .selectAll('text')
      .attr('font-size', '16px');
  }

  /**
   * Handles updating the chart when input data is changed, sets a nice transtion for the
   * bars on chart.
   */
  function updateChart() {
    const Y_ZERO = yScale(0);
    const TRANSITION_TIME_MS = 500;
    const TRANSITION = d3.transition().duration(TRANSITION_TIME_MS);

    const rects = d3Chart.selectAll('rect')
      .data(chartData);

    // Exit old elements
    rects.exit().remove();

    // Add new elements
    rects.enter()
      .append('rect')
      .attr('y', Y_ZERO)
      .attr('x', data => {
        return xScale(data.artist);
      })
      .attr('width', xScale.bandwidth)
      .attr('fill', data => {
        return colorScale(data.artist);
      })
      .transition(TRANSITION)
      .attr('y', data => {
        return yScale(data.percentUnique);
      })
      .attr('height', data => {
        return height - yScale(data.percentUnique);
      });
  }

  // Given Helper functions
  /**
   * Returns the a newly created DOM element of given tag.
   * @param {string} tagName - HTML tag to be created.
   * @returns {object} - DOM object of new element.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} elId - element ID.
   * @returns {object} - DOM object associated with id.
   */
  function id(elId) {
    return document.getElementById(elId);
  }

  /**
   * Returns first element matching selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} - DOM object associated selector.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns first element matching selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} - DOM object associated selector.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }
})();