/**
 * Name: Justin Clayton
 * Date: Aptil 17, 2020
 * Section: CSE 154 AD
 * This is the main js page to complete the logic for index.html. It sets up and plays a simplified
 * game of 5 card draw poker. It is a bit more involved than initially intended and as much testing
 * was done as was feasible. It appears to handle the majority of win conditions correct, but there
 * is a chance that some win cases could have bugs.
 */
'use strict';
(function() {
  // Module global variables

  window.addEventListener('load', init);

  /** Sets up the event listeners and state to play the game. */
  function init() {

  }

  // Event Listeners


  // JS Helper functions
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