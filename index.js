/**
 * Name: Justin Clayton
 * Date: May 3, 2020
 * Section: CSE 154 AD
 *
 */
'use strict';
(function() {
  // API URL
  const BASE_URL = 'https://api.lyrics.ovh/v1';
  // D3 Global variables
  const CHART_MARGIN = { LEFT: 100, RIGHT: 10, TOP: 25, BOTTOM: 150 };
  let d3Chart;
  let width, height;
  let xScale, yScale, colorScale;
  let chartData = [
    {artist: 'Aesop Rock', percentUnique: 87},
    {artist: 'Atmosphere', percentUnique: 73},
    {artist: 'Pink Floyd', percentUnique: 33},
    {artist: 'ABBA', percentUnique: 11}
  ];
  // Webpage global variables
  let artistDetails = {};

  window.addEventListener('load', init);
  window.addEventListener('resize', initChart);

  /** Set up the page for user interaction. */
  function init() {
    initChart();
    id('submit-btn').addEventListener('click', onSubmit);
  }

  // Event Listeners
  /** Check the inputs and make the request when the form is submitted. */
  function onSubmit(event) {
    event.preventDefault();
    let artist = qs('input[name="artist"]').value.trim();
    let song = qs('input[name="song"]').value.trim();
    if (song && artist) {
      let url = `${BASE_URL}/${artist}/${song}`;
      fetch(url)
        .then(checkStatus)
        .then(res => res.json())
        .then(data => {
          processResponse(data, artist, song);
        })
        .catch(console.error);
    } else {
      createMessage('error', 'Please enter an artist and song to make a request.')
    }
  }

  // Fetch helper functions
  /** Check whether fetch returned a status of 200 OK, throw an error if not. */
  function checkStatus(response) {
    if (response.ok) {
      return response;
    } else {
       throw Error("Error in request: " + response.statusText);
    }
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
   *
   * @param {string} artist - The artist to create/update the card for.
   */
  function createCard(artist) {
    let artistCard = id(artist);

    if(artistCard) {
      artistCard.innerHTML = '';
    } else {
      artistCard = gen('div');
      artistCard.setAttribute('id', artist);
      artistCard.classList.add('card');
      id('card-container').appendChild(artistCard);
    }

    let title = gen('h3');
    title.textContent = artist;
    let totalUniqueWords = gen('p');
    totalUniqueWords.textContent = `Unique Words: ${artistDetails[artist].totalUniqueWords}`;
    let totalWords = gen('p');
    totalWords.textContent = `Total Words: ${artistDetails[artist].totalWords}`;
    let percentUnique = gen('p');
    percentUnique.textContent = `Percent Unique: ${artistDetails[artist].percentUnique}`;
    artistCard.appendChild(title);
    artistCard.appendChild(totalUniqueWords);
    artistCard.appendChild(totalWords);
    artistCard.appendChild(percentUnique);
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
   * Takes in the string of lyrics from the API and processes it to get individual words.
   * @param {string} lyrics - The lyrics to get words from.
   * @return {array} An array of the words in the lyrics.
   */
  function extractWords(lyrics) {
    let lyricsLowerCase = lyrics.toLowerCase();
    let regexPattern = /[.,\/#!$%\^&\*;:{}=\-_`~()\?\n]/g;
    let lyricsWithoutPunct = lyricsLowerCase.replace(regexPattern, ' ');
    let words = lyricsWithoutPunct.split(' ').filter(word => {
      return word;
    });
    return words;
  }

  /**
   * Recalculates the percent of words that are unique for and artist.
   * @param {string} artist - The artist to recalculate the percent unique for.
   */
  function getPercentage(artist) {
    const PERCENT = 100;
    let numUnique = artistDetails[artist].totalUniqueWords;
    let total = artistDetails[artist].totalWords;
    let percent = Math.round(numUnique / total * PERCENT);
    artistDetails[artist].percentUnique = `${percent}%`
  }

  /**
   *
   * @param {array} words - An aray of the words in the lyrics.
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

  /** Handle an error if thrown during fetch */
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
    let message = `Successfully retrieved lyrics of ${song} by ${artist}. Processing...`;
    createMessage('success', message);
    let words = extractWords(data.lyrics);

    // Try to make artist and song unique so will not be queried again.
    artist = artist.toLowerCase();
    song = song.toLowerCase();

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

  // D3 functions
  /**
   * Finds size available for chart and sets up the d3 chart which is attached to the HTML figure
   * element with id chart. Then loads the available data.
   */
  function initChart() {
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

  /** Uses built in d3 color scale with 12 colors, maps artists to color */
  function getColorScale() {
    return d3.scaleOrdinal()
      .domain(chartData.map( d => {
        return d.artist
      }))
      .range(d3.schemePaired);
  }

  /** Find the size of the parent container of the chart. */
  function getSize() {
    width = id('chart').clientWidth - CHART_MARGIN.LEFT - CHART_MARGIN.TOP;
    height = 600 - CHART_MARGIN.TOP - CHART_MARGIN.BOTTOM;
  }

  /** Set up a band scale which converts the current artists to a position on the x axis. */
  function getXScale() {
    const LOWER_RANGE = 0;
    const PADDING_VALUE = 0.3;

    return d3.scaleBand()
      .domain(chartData.map( d => {
        return d.artist;
      }))
      .range([LOWER_RANGE, width])
      .paddingInner(PADDING_VALUE)
      .paddingOuter(PADDING_VALUE);
  }

  /**
   * Set up a linear scale that sizes the height of the recangle based on percentage of lyrics
   * that are unique.
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
    const X_AXIS_CALL = d3.axisBottom(xScale);

    // X Axis Label
    d3Chart.append('text')
      .attr('class', 'x axis-label')
      .attr('x', width/2)
      .attr('y', height + 125)
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
    const Y_AXIS_CALL = d3.axisLeft(yScale)
      .ticks(10)
      .tickFormat( d => {
        return d + '%';
      });

    // Y Axis Label
    d3Chart.append('text')
      .attr('class', 'y axis-label')
      .attr('x', -height/2)
      .attr('y', -80)
      .attr('font-size', '24px')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text('Percent of Lyrics Unique (%)');

    // Y Axis Setup
    d3Chart.append('g')
      .attr('class', 'y-axis')
      .call(Y_AXIS_CALL)
      .selectAll('text')
        .attr('font-size', '16px')
  }

  /**
   * Handles updating the chart when input data is changed, sets a nice transtion for the
   * bars on chart.
   */
  function updateChart() {
    const Y_ZERO = yScale(0);
    const TRANSITION_TIME_MS = 500;
    const T = d3.transition().duration(TRANSITION_TIME_MS);

    const rects = d3Chart.selectAll('rect')
      .data(chartData);

    // Exit old elements
    rects.exit().remove();

    // Add new elements
    rects.enter()
      .append('rect')
        .attr('y', Y_ZERO)
        .attr('x', d => {
          return xScale(d.artist);
        })
        .attr('width', xScale.bandwidth)
        .attr('fill', d => {
          return colorScale(d.artist);
        })
        .transition(T)
          .attr('y', d => {
            return yScale(d.percentUnique);
          })
          .attr('height', d => {
            return height - yScale(d.percentUnique);
          })
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
   * Returns all elements matching selector.
   * @param {string} selector - CSS query selector.
   * @returns {array} - Array of DOM objects with associated selector.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }
})();