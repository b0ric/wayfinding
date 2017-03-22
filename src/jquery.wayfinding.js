/*global document, jQuery*/
/*jslint devel: true, browser: true, windows: true, plusplus: true, maxerr: 50, indent: 4 */

/**
 * @preserve
 * Wayfinding v2.0.0
 * https://github.com/ucdavis/wayfinding
 *
 * Copyright (c) 2010-2014 University of California Regents
 * Licensed under GNU General Public License v2
 * http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 *
 * Date: 2014-12-02
 *
 * @module wayfinding
 * @main wayfinding
 * @namespace wayfinding
 * @version 2.0.0
 * @requires jQuery
 *
 */

//  <![CDATA[

(function ($) {
  'use strict';

  /**
   * @typedef defaults
   * @memberOf wayfinding
   * @type {object}
   * @property {map[]} maps collection of maps to be used by wayfinding
   * @property {path} path collection of behavior and styling for the solution path
   * @property {string|function} startpoint either a string identifier for
   * the startpoint or a function that returns the same
   * @property {string|function} endpoint either a string identifier for the
   * endpoint or a function that returns the same
   * @property {boolean} accessibleRoute if true will avoid routes that use stairs
   * @property {string|function} defaultMap either a string idenfier for the
   * map to show upon load, or a function that returns the same
   * @property {string} loadMessage the message to show while the maps are bring loaded
   * @property {null|object|string} datastoreCache [description]
   * @property {boolean} showLocation [description]
   * @property {object} locationIndicator [description]
   * @property {boolean} pinchToZoom [description]
   * @property {boolean} zoomToRoute [description]
   * @property {integer} zoomPadding [description]
   * @property {integer} floorChangeAnimationDelay [description]
   */

  var defaults = {
      /**
       * @typedef map
       * @memberOf wayfinding
       * @type object
       * @property {string} path relative URL to load the map from
       * @property {string} id the identifier by which the map is referenced by other maps
       */
      'maps': [{'path': 'floorplan.svg', 'id': 'map.1'}],
      /**
       * @typedef path
       * @memberOf wayfinding
       * @typedef {object}
       * @property {string} color any valid CSS color
       * @property {integer} radius the turn ration in pixels to apply to the solution path
       * @property {integer} speed the speed at which the solution path will be drawn
       * @property {integer} width the width in pixels of the solution path
       */
      'path': {
        color: 'red', // the color of the solution path that will be drawn
        radius: 10, // the radius in pixels to apply to the solution path
        speed: 8, // the speed at which the solution path with be drawn
        width: 3 // the width of the solution path in pixels
      },
      // The point identifier for the default starting point
      'startpoint': function () {
        return 'startpoint';
      },
      // If specified in the wayfinding initialization
      // route to this point as soon as the maps load. Can be initialized
      // as a function or a string (for consistency with startpoint)
      'endpoint': false,
      'accessibleRoute': false, // Controls routing through paths/portals with data-accessible-route attribute
      // Provides the identifier for the map that should be show at startup,
      // if not given will default to showing first map in the array
      'defaultMap': function () {
        return 'map.1';
      },
      'loadMessage': 'Loading',
      // should dataStoreCache should be used
      // null is cache should not be used
      // object if cache is being passed
      // string representing url if it should be used
      // string is URL path where filename to load will be in the form startpoint + '.json' or startpoint + '.acc.json'
      'dataStoreCache': null,
      'showLocation': false, // place marker for "you are here"
      //styling for the "you are here pin"
      'locationIndicator': {
        startPin: {
          fill: 'red',
          letterFill: 'white',
          height: 100
        },
        destinationPin: {
          fill: 'blue',
          letterFill: 'white',
          height: 100
        },
        locationPin: {
          fill: 'green',
          letterFill: 'white',
          height: 100
        }
      },
      'pinchToZoom': false, // requires jquery.panzoom
      'panzoom': {
        'minScale': 1, // min zoom scale
        'maxScale': 30, // max zoom scale
        'viewboxScale': 1, // scale the viewbox when zooming
        'contain': 'invert', // Indicate that the element should be contained within its parent when panning (https://github.com/timmywil/jquery.panzoom for more infos)
        'cursor': 'pointer', // Default cursor style for the element
        '$zoomIn': $(), // zoom in button jQuery object
        '$zoomOut': $(), // zoom out button jQuery object
        '$reset': $() // zoom reset button jQuery object
      },
      'zoomToRoute': false,
      'zoomPadding': 25,
      'autoChangeFloor': false, // change floor automatically or require a user's action
      'prevStepTrigger': '#prev-step', // selector of the previous step trigger element
      'nextStepTrigger': '#next-step', // selector of the next step trigger element
      'floorChangeAnimationDelay': 1250, // milliseconds to wait during animation when a floor change occurs
      // directions output
      'directionsOutput': true,
      'directionsContainer': '#directions', // selector of the directions container
      'directionsClass': '', // class for the <ol> containing the directions
      'directionsOlType': 'a', // Type of list element for the <ol>
      'directionsLanguage': 'fr', // Language used for the textual directions.
      'mapRatio': 7, // ratio used to calculate distances
    },
    instructions,
    dataStore;

  // should array of arrays be looked into
  // should floor only be stored by id?
  // or is it enough that it is already the index of the enclosing array?
  // remove portal id strings?

  /**
   * @typedef datastore
   * @memberOf plugin
   * @type {object}
   * @property {floors[]} p holds an array of floors each of which has an array of paths
   * @property {portals[]} q holds an array of portals
   */

  /**
   * @typedef floors
   * @memberOf plugin
   * @type {paths[]}
   */

  /**
   * @typedef paths
   * @memberOf plugin
   * @type {object}
   * @property {string} floor floor identifier
   * @property {float} x on the first end of the path the x coord
   * @property {float} y on the first end of the path the y coord
   * @property {float} m on the second end of the path the x coord
   * @property {float} n on the second end of the path the y coord
   * @property {string[]} d an array of points that connect to the first end of the path
   * @property {string[]} e an array of points that connect to the second end of the path
   * @property {string[]} c array of connections to other paths
   * @property {string[]} q array of connections to portals
   * @property {string} o prior path type "pa" or "po"
   * @property {float} l length of this segment
   * @property {float} r current shortest combined lengths to reach here
   * @property {string} p prior path segment to follow back for shortest path
   */

  /**
   * @typedef portals
   * @memberOf plugin
   * @type {object}
   * @property {string} t portal type as string
   * @property {boolean} a accessible boolean
   * @property {string} f floor of first end as string
   * @property {integer} g floor of first end as number
   * @property {float} x x coord of first end
   * @property {float} y y coord of first end
   * @property {float} c connections to paths of first end
   * @property {string} j floor of second end as string
   * @property {integer} k floor of second end as number
   * @property {float} m x coord of second end
   * @property {float} n y coord of second end
   * @property {string[]} d connections to paths of second end
   * @property {float} l length of this segment
   * @property {float} r current shortest combined lengths to reach here
   * @property {string} p prior path segment to follow back for shortest path
   * @property {integer} q prior map number
   * @property {string} o prior path type "pa" or "po"
   */

  /**
   * The jQuery plugin namespace.
   * @external "jQuery.fn"
   * @see {@link http://docs.jquery.com/Plugins/Authoring The jQuery Plugin Guide}
   */

  /**
   * Wayfinding
   * @function external:"jQuery.fn".wayfinding
   * @namespace plugin
   */

  $.fn.wayfinding = function (action, options, callback)
  {
    var passed = options,
      obj, // the jQuery object being worked with;
      maps, // the array of maps populated from options each time
      defaultMap, // the floor to show at start propulated from options
      startpoint, // the result of either the options.startpoint value or the value of the function
      portalSegments = [], // used to store portal pieces until the portals are assembled, then this is dumped.
      solution,
      result, // used to return non jQuery results
      drawing;


    /**
     * @function escapeSelector
     * @memberOf plugin
     * @private
     * @inner
     * @param {string} sel the jQuery selector to escape
     * @description to handle jQuery selecting ids with periods and other special characters
     */
    function escapeSelector(sel)
    {
      return sel.replace(/(:|\.|\[|\])/g, '\\$1');
    }

    /**
     * Applies linear interpolation to find the correct value
     * for traveling from value oldValue to newValue taking into account
     * that you are (i / steps) of the way through the process
     *
     * @param oldValue
     * @param newValue
     * @param i
     * @param steps
     * @returns {number}
     */
    function interpolateValue(oldValue, newValue, i, steps)
    {
      return (((steps - i) / steps) * oldValue) + ((i / steps) * newValue);
    }

    /**
     *
     * @param value
     * @constructor
     */
    function CheckMapEmpty(value)
    {
      this.value = value;
      this.message = ' no maps identified in collection to load';
      this.toString = function () {
        return this.value + this.message;
      };
    }

    /**
     *
     * @param value
     * @constructor
     */
    function CheckMapDuplicates(value)
    {
      this.value = value;
      this.message = ' has duplicate map ids';
      this.toString = function () {
        return this.value + this.message;
      };
    }

    /**
     *
     * @param value
     * @constructor
     */
    function CheckMapBadDefault(value)
    {
      this.value = value;
      this.message = ' wasn\'t in the list of maps';
      this.toString = function () {
        return this.value + this.message;
      };
    }

    /**
     * Ensure floor ids are unique.
     *
     * @param el
     */
    function checkIds(el)
    {
      var mapNum,
        checkNum,
        reassign = false,
        defaultMapValid = false,
        status;

      status = $(el).find('div')
      .hide()
      .end()
      .append('<div id="WayfindingStatus" style="">' + options.loadMessage + '</div>');

      if (maps.length > 0) {
        for (mapNum = 0; mapNum < maps.length; mapNum++) {
          for (checkNum = mapNum; checkNum < maps.length; checkNum++) {
            if (mapNum !== checkNum && maps[mapNum].id === maps[checkNum].id) {
              reassign = true;
            }
          }
        }
        if (reassign === true) {
          $(status).text(options.errorMessage);
          throw new CheckMapDuplicates(JSON.stringify(maps));
        }

        //check that defaultMap is valid as well
        for (mapNum = 0; mapNum < maps.length; mapNum++) {
          if (maps[mapNum].id === defaultMap) {
            defaultMapValid = true;
          }
        }
        if (defaultMapValid === false) {
          $(status).text(options.errorMessage);
          throw new CheckMapBadDefault(defaultMap);
        }
      } else {
        // raise exception about no maps being found
        $(status).text(options.errorMessage);
        throw new CheckMapEmpty(JSON.stringify(maps));
      }
    } // end function checkIds

    /**
     * Takes x and y coordinates and makes a location indicating pin for those
     * coordinates. Returns the pin element, not yet attached to the DOM.
     *
     * @param x
     * @param y
     * @param type
     * @returns {Element|*}
     */
    function makePin(x, y, type)
    {
      var indicator,
        pin,
        pinContent,
        height = options.locationIndicator[type].height, // add error checking?
        symbolPath,
        pinContentPath;

      indicator = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      $(indicator).attr('class', type);

      pin = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      symbolPath = 'M13.8,0C6.2,0,0,6.2,0,13.8c0,7.4,12.4,20.5,13,21.1l0.8,0.9l0.8-0.9c0.5-0.6,13-13.7,13-21.1C27.6,6.3,21.3,0.1,13.8,0z';
      pinContentPath = {
        startPin: 'M10.8,18.5L9,24H6.7l5.9-17.2h2.7L21.1,24h-2.4l-1.8-5.4H10.8z M16.4,16.8l-1.7-5c-0.4-1.1-0.6-2.1-0.9-3.1h-0.1c-0.3,1-0.5,2.1-0.9,3.1l-1.7,5H16.4z',
        destinationPin: 'M8.5,6.7c1.1-0.2,2.8-0.4,4.5-0.4c2.5,0,4,0.4,5.2,1.4c1,0.7,1.6,1.9,1.6,3.4c0,1.8-1.2,3.4-3.2,4.2v0.1c1.8,0.5,3.9,1.9,3.9,4.8c0,1.6-0.6,2.9-1.6,3.8c-1.3,1.2-3.5,1.8-6.6,1.8c-1.7,0-3-0.1-3.8-0.2V6.7z M11,14.5h2.2c2.6,0,4.1-1.4,4.1-3.2c0-2.2-1.7-3.1-4.2-3.1c-1.1,0-1.8,0.1-2.2,0.2V14.5z M11,23.6c0.5,0.1,1.2,0.1,2.1,0.1c2.5,0,4.9-0.9,4.9-3.7c0-2.6-2.2-3.7-4.9-3.7h-2V23.6z',
        locationPin: 'M827.42,300.94  c-1.971,0-3.566-1.596-3.566-3.565s1.596-3.565,3.566-3.565c1.969,0,3.564,1.596,3.564,3.565S829.389,300.94,827.42,300.94z'
      };

      pin.setAttribute('d', symbolPath);
      pin.setAttribute('fill', options.locationIndicator[type].fill);

      indicator.appendChild(pin);

      if(type !== 'locationPin') {
        pinContent = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pinContent.setAttribute('d', pinContentPath[type]);
        pinContent.setAttribute('fill', options.locationIndicator[type].letterFill);

        indicator.appendChild(pinContent);
      } else {
        pinContent = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pinContent.setAttribute('cx', 13.8);
        pinContent.setAttribute('cy', 13);
        pinContent.setAttribute('r', 6);
        pinContent.setAttribute('fill', options.locationIndicator[type].letterFill);

        indicator.appendChild(pinContent);
      }


      var translate = 'translate(' + (x - (height / 9.1)) + ' ' + (y - (height / 3.37)) + ') scale(' + height / 125 + ')';
      indicator.setAttribute('transform', translate);

      return indicator;
    } // end function makePin

    /**
     * Extract data from the svg maps
     *
     * @param mapNum
     * @param map
     * @param el
     */
    function buildDataStore(mapNum, map, el)
    {
      var path, pointId, cx, cy,
        matches, portal, portalId, ar,
        checkpoint;

      dataStore.p[mapNum] = [];

      //Paths
      $('#Paths line', el).each(function () {
        ar = ($(this).data('accessible-route') !== false) ? true : false;
        path = {
          floor: map.id, // floor_1
          r: Infinity, // Distance
          p: -1, // Prior node in path that yielded route distance
          x: $(this).attr('x1'),
          y: $(this).attr('y1'),
          d: [],
          m: $(this).attr('x2'),
          n: $(this).attr('y2'),
          e: [],
          ar: ar,
          c: [], //other paths
          q: [], // connected portals
          checkpoint: $(this).data('checkpoint')
        };
        path.l = Math.sqrt(Math.pow(path.x - path.m, 2) + Math.pow(path.y - path.n, 2));

        dataStore.p[mapNum].push(path);
      });

      // Destinations: roomId or POI_Id
      $('#Points circle[data-destination]', el).each(function () { // index, line
        cx = $(this).attr('cx');
        cy = $(this).attr('cy');
        pointId = $(this).attr('id');

        $.each(dataStore.p[mapNum], function (index, segment) {
          if (map.id === segment.floor && ((segment.x === cx && segment.y === cy))) {
            segment.d.push(pointId);
          } else if (map.id === segment.floor && ((segment.m === cx && segment.n === cy))) {
            segment.e.push(pointId);
          }
        });

      });

      //Portal Segments -- string theory says unmatched portal segment useless -- no wormhole
      $('#Portals circle', el).each(function () { // index, line
        portalId = $(this).attr('id');
        if (portalId && portalId.indexOf('_') > -1) {
          portalId = portalId.slice(0, portalId.indexOf('_'));
        }
        ar = ($(this).data('accessible-route') !== false) ? true : false;
        portal = {
          id: portalId,
          type: ($(this).data('portal-type') !== undefined) ? $(this).data('portal-type') : 'portal',
          floor: map.id,
          ar: ar,
          mate: portalId.split('.').slice(0, 2).join('.') + '.' + map.id,
          mapNum: mapNum,
          matched: false
        };

        cx = $(this).attr('cx');
        cy = $(this).attr('cy');

        matches = $.grep(dataStore.p[mapNum], function (n) { // , i
          return ((cx === n.x && cy === n.y) || (cx === n.m && cy === n.n));
        });

        if (matches.length !== 0) {
          portal.x = cx;
          portal.y = cy;
        }

        //portal needs length -- long stairs versus elevator
        portal.l = Math.sqrt(Math.pow(cx, 2) + Math.pow(cy, 2));
        portalSegments.push(portal);
      });

      // Checkpoints:
      dataStore.c[mapNum] = {};
      $('#Points circle[data-checkpoint]', el).each(function () { // index, line
        cx = $(this).attr('cx');
        cy = $(this).attr('cy');
        checkpoint = {
          id: $(this).attr('id'),
          cx: parseInt(cx),
          cy: parseInt(cy),
          name: $(this).data('name')
        };

        dataStore.c[mapNum][cx+'-'+cy] = checkpoint;
      });

    } // function buildDataStore

    /**
     * After data extracted from all svg maps then build portals between them
     *
     */
    function buildPortals()
    {

      var segmentOuterNum, segmentInnerNum,
        outerSegment, innerSegment,
        portal, mapNum,
        pathOuterNum, pathInnerNum,
        currentInnerPath, currentOuterPath,
        portalNum, pathNum,
        currentPortal, currentPath;

      for (segmentOuterNum = 0; segmentOuterNum < portalSegments.length; segmentOuterNum++) {
        outerSegment = portalSegments[segmentOuterNum];
        if (outerSegment.matched === false) {

          for (segmentInnerNum = segmentOuterNum; segmentInnerNum < portalSegments.length; segmentInnerNum++) {
            if (portalSegments[segmentInnerNum].id === outerSegment.mate && portalSegments[segmentInnerNum].mate === outerSegment.id) {
              innerSegment = portalSegments[segmentInnerNum];

              portal = {};

              outerSegment.matched = true;
              innerSegment.matched = true;

              portal = {
                t: outerSegment.type,
                a: outerSegment.ar,
                // idA: outerSegment.id,
                f: outerSegment.floor,
                g: outerSegment.mapNum,
                x: outerSegment.x,
                y: outerSegment.y,
                c: [], //only paths
                // idB: innerSegment.id,
                j: innerSegment.floor,
                k: innerSegment.mapNum,
                m: innerSegment.x,
                n: innerSegment.y,
                d: [], // only paths
                l: outerSegment.l + innerSegment.l, // length is combined lengths
                r: Infinity,
                p: -1
              };

              dataStore.q.push(portal);
            }
          }
        }
      }

      //check each path for connections to other paths
      //checks only possible matchs on same floor, and only for half-1 triangle of search area to speed up search
      for (mapNum = 0; mapNum < maps.length; mapNum++) {
        for (pathOuterNum = 0; pathOuterNum < dataStore.p[mapNum].length - 1; pathOuterNum++) {
          for (pathInnerNum = pathOuterNum + 1; pathInnerNum < dataStore.p[mapNum].length; pathInnerNum++) {
            currentInnerPath = dataStore.p[mapNum][pathInnerNum];
            currentOuterPath = dataStore.p[mapNum][pathOuterNum];
            if (
              (currentInnerPath.x === currentOuterPath.x && currentInnerPath.y === currentOuterPath.y) ||
              (currentInnerPath.m === currentOuterPath.x && currentInnerPath.n === currentOuterPath.y) ||
              (currentInnerPath.x === currentOuterPath.m && currentInnerPath.y === currentOuterPath.n) ||
              (currentInnerPath.m === currentOuterPath.m && currentInnerPath.n === currentOuterPath.n)
            ) {
              // push onto connections
              currentOuterPath.c.push(pathInnerNum);
              currentInnerPath.c.push(pathOuterNum);
            }
          }
        }
      }

      //optimize portal searching of paths
      for (portalNum = 0; portalNum < dataStore.q.length; portalNum++) {
        for (mapNum = 0; mapNum < maps.length; mapNum++) {
          for (pathNum = 0; pathNum < dataStore.p[mapNum].length; pathNum++) {
            currentPortal = dataStore.q[portalNum];
            currentPath = dataStore.p[mapNum][pathNum];
            if (
              currentPortal.f === currentPath.floor &&
              ((currentPortal.x === currentPath.x && currentPortal.y === currentPath.y) ||
              (currentPortal.x === currentPath.m && currentPortal.y === currentPath.n))
            ) {
              currentPortal.c.push(pathNum);
              currentPath.q.push(portalNum);
            }
            else if (
              currentPortal.j === currentPath.floor &&
              ((currentPortal.m === currentPath.x && currentPortal.n === currentPath.y) ||
              (currentPortal.m === currentPath.m && currentPortal.n === currentPath.n))
            ) {
              currentPortal.d.push(pathNum);
              currentPath.q.push(portalNum);
            }
          }
        }
      }

      portalSegments = [];
    } // end function buildportals

    /**
     * Get the set of paths adjacent to a point or endpoint.
     *
     */
    function getPointPaths(point)
    {
      var mapNum,
        pathNum,
        pointANum,
        pointBNum,
        pointPaths = {
          'paths': [],
          'floor': null
        };

      for (mapNum = 0; mapNum < maps.length; mapNum++) {
        for (pathNum = 0; pathNum < dataStore.p[mapNum].length; pathNum++) {
          for (pointANum = 0; pointANum < dataStore.p[mapNum][pathNum].d.length; pointANum++) {
            if (dataStore.p[mapNum][pathNum].d[pointANum] === point) {
              pointPaths.paths.push(pathNum); // only pushing pathNum because starting on a single floor
              pointPaths.floor = dataStore.p[mapNum][pathNum].floor;
            }
          }
          for (pointBNum = 0; pointBNum < dataStore.p[mapNum][pathNum].e.length; pointBNum++) {
            if (dataStore.p[mapNum][pathNum].e[pointBNum] === point) {
              pointPaths.paths.push(pathNum); // only pushing pathNum because starting on a single floor
              pointPaths.floor = dataStore.p[mapNum][pathNum].floor;
            }
          }
        }
      }

      return pointPaths;
    } // end function getPointPaths

    /**
     * For each path on this floor look at all the paths we know connect to it
     *
     * @param segmentType: PA (path) or PO (portal)
     * @param segmentFloor: limits search
     * @param segment: id per type and floor
     * @param length: total length of current thread
     */
    function recursiveSearch(segmentType, segmentFloor, segment, length)
    {
      // for each connection
      $.each(dataStore.p[segmentFloor][segment].c, function (i, tryPath) {
        // check and see if the current path is a shorter path to the new path
        if (length + dataStore.p[segmentFloor][tryPath].l < dataStore.p[segmentFloor][tryPath].r && (options.accessibleRoute === false ||
          (options.accessibleRoute === true && dataStore.p[segmentFloor][tryPath].ar === true))) {
          dataStore.p[segmentFloor][tryPath].r = length + dataStore.p[segmentFloor][tryPath].l;
          dataStore.p[segmentFloor][tryPath].p = segment;
          dataStore.p[segmentFloor][tryPath].o = segmentType;
          recursiveSearch('pa', segmentFloor, tryPath, dataStore.p[segmentFloor][tryPath].r);
        }
      });

      // if the current path is connected to any portals
      if (dataStore.p[segmentFloor][segment].q.length > 0) {
        // look at each portal, tryPortal is portal index in portals
        $.each(dataStore.p[segmentFloor][segment].q, function (i, tryPortal) {
          if (length + dataStore.q[tryPortal].l < dataStore.q[tryPortal].r && (options.accessibleRoute === false || (options.accessibleRoute === true && dataStore.q[tryPortal].a))) {
            dataStore.q[tryPortal].r = length + dataStore.q[tryPortal].l;
            dataStore.q[tryPortal].p = segment;
            dataStore.q[tryPortal].q = segmentFloor;
            dataStore.q[tryPortal].o = segmentType;

            // if the incoming segment to the portal is at one end of the portal try all the paths at the other end
            if ($.inArray(segment, dataStore.q[tryPortal].c) !== -1) {
              $.each(dataStore.q[tryPortal].d, function (ia, tryPath) {
                //if adding this path
                if (length + dataStore.q[tryPortal].l + dataStore.p[dataStore.q[tryPortal].k][tryPath].l < dataStore.p[dataStore.q[tryPortal].k][tryPath].r) {
                  dataStore.p[dataStore.q[tryPortal].k][tryPath].r = dataStore.q[tryPortal].r + dataStore.p[dataStore.q[tryPortal].k][tryPath].l;
                  dataStore.p[dataStore.q[tryPortal].k][tryPath].p = tryPortal;
                  dataStore.p[dataStore.q[tryPortal].k][tryPath].o = 'po';
                  recursiveSearch('pa', dataStore.q[tryPortal].k, tryPath, dataStore.p[dataStore.q[tryPortal].k][tryPath].r);
                }
              });
            } else {
              $.each(dataStore.q[tryPortal].c, function (ib, tryPath) {
                // if adding this path
                if (length + dataStore.q[tryPortal].l + dataStore.p[dataStore.q[tryPortal].g][tryPath].l < dataStore.p[dataStore.q[tryPortal].g][tryPath].r) {
                  dataStore.p[dataStore.q[tryPortal].g][tryPath].r = dataStore.q[tryPortal].r + dataStore.p[dataStore.q[tryPortal].g][tryPath].l;
                  dataStore.p[dataStore.q[tryPortal].g][tryPath].p = tryPortal;
                  dataStore.p[dataStore.q[tryPortal].g][tryPath].o = 'po';
                  recursiveSearch('pa', dataStore.q[tryPortal].g, tryPath, dataStore.p[dataStore.q[tryPortal].g][tryPath].r);
                }
              });
            }
          }
        });
      }
    } // end function recursiveSearch

    /**
     *
     */
    function generateRoutes()
    {
      var sourceInfo,
        mapNum,
        sourcemapNum;

      sourceInfo = getPointPaths(startpoint);

      for (mapNum = 0; mapNum < maps.length; mapNum++) {
        if (maps[mapNum].id === sourceInfo.floor) {
          sourcemapNum = mapNum;
          break;
        }
      }

      $.each(sourceInfo.paths, function (i, pathId) {
        dataStore.p[sourcemapNum][pathId].r = dataStore.p[sourcemapNum][pathId].l;
        dataStore.p[sourcemapNum][pathId].p = 'point';
        recursiveSearch('pa', sourcemapNum, pathId, dataStore.p[sourcemapNum][pathId].l);
      });
    } // end function generateRoutes

    /**
     * From a given end point generate an array representing the reverse steps needed
     * to reach destination along shortest path
     *
     * @param segmentType
     * @param segmentFloor
     * @param segment
     */
    function backTrack(segmentType, segmentFloor, segment)
    {
      var step;

      // if we aren't at the startpoint point
      if (segment !== 'point') {
        step = {};
        step.type = segmentType;
        step.floor = segmentFloor;
        step.segment = segment;
        step.checkpoint = (dataStore.p[segmentFloor][segment].checkpoint === true) ? true : false;
        solution.push(step);
        switch (segmentType) {
          case 'pa':
            backTrack(dataStore.p[segmentFloor][segment].o, segmentFloor, dataStore.p[segmentFloor][segment].p);
            break;
          case 'po':
            backTrack(dataStore.q[segment].o, dataStore.q[segment].q, dataStore.q[segment].p);
            break;
        }
      }
    } // end function backTrack

    /**
     *
     * @returns {*}
     */
    function getShortestRoute()
    {
      var destInfo,
        mapNum,
        destinationmapNum,
        reversePathStart,
        minPath,
        i;

      destInfo = getPointPaths(options.endpoint);

      for (mapNum = 0; mapNum < maps.length; mapNum++) {
        if (maps[mapNum].id === destInfo.floor) {
          destinationmapNum = mapNum;
          break;
        }
      }

      minPath = Infinity;
      reversePathStart = -1;

      for (i = 0; i < destInfo.paths.length; i++) {
        if (dataStore.p[destinationmapNum][destInfo.paths[i]].r < minPath) {
          minPath = dataStore.p[destinationmapNum][destInfo.paths[i]].r;
          reversePathStart = destInfo.paths[i];
        }
      }

      if (reversePathStart !== -1) {
        solution = []; //can't be set in backtrack because it is recursive.
        backTrack('pa', destinationmapNum, reversePathStart);
        solution.reverse();
      }
      return solution;
    } // end function getShortestRoute

    /**
     *
     * @returns {{p: Array, q: Array}|*}
     */
    function build()
    {

      dataStore = {
        'p': [], // paths
        'q': [], // portals
        'c': [] // checkpoints
      };

      portalSegments = [];

      // Build the dataStore from each map given
      $.each(maps, function (i, map) {
        buildDataStore(i, map, map.el);
      });

      buildPortals();
      generateRoutes();
      if(options.directionsOutput) {
        getInstructions(options.directionsLanguage);
      }

      return dataStore;
    } // function build

    /**
     * Ensure a dataStore exists and is set, whether from a cache or by building it.
     *
     * @param onReadyCallback
     */
    function establishDataStore(onReadyCallback)
    {
      if (options.dataStoreCache) {
        if (typeof options.dataStoreCache === 'object') {

          dataStore = options.dataStoreCache;

          if (typeof onReadyCallback === 'function') {
            onReadyCallback();
          }
        } else if (typeof options.dataStoreCache === 'string') {
          var cacheUrl = options.dataStoreCache + startpoint + ((options.accessibleRoute) ? '.acc' : '') + '.json';

          $.getJSON(cacheUrl, function (response) {

            dataStore = response;

            if (typeof onReadyCallback === 'function') {
              onReadyCallback();
            }
          }).fail(function () {

            dataStore = build();

            if (typeof onReadyCallback === 'function') {
              onReadyCallback();
            }
          });
        }
      } else {

        dataStore = build();

        if (typeof onReadyCallback === 'function') {
          onReadyCallback();
        }
      }
    }

    /**
     * Set the start point, and put a location indicator in that spot, if feature is enabled.
     * if using dataStores then trigger loading of new datastore.
     *
     * @param point
     * @param el
     */
    function setStartPoint(point, el)
    {
      var start,
        attachPinLocation,
        x,
        y,
        pin;

      //clears locationIndicators from the maps
      $('g.startPin', el).remove();

      options.startpoint = point;

      // set startpoint correctly
      if (typeof options.startpoint === 'function') {
        startpoint = options.startpoint();
      } else {
        startpoint = options.startpoint;
      }

      if (options.showLocation) {

        start = $('#Points #' + escapeSelector(startpoint), el);

        var startMap = el.children().has($('#' + escapeSelector(startpoint)));

        attachPinLocation = $('svg', startMap).children().last();

        if (start.length) {
          x = (Number(start.attr('cx')));
          y = (Number(start.attr('cy')));
          pin = makePin(x, y, 'startPin');

          attachPinLocation.after(pin);
        } else {
          return; //start point does not exist
        }
      }
    } //end function setStartPoint

    /**
     *
     * @param endPoint
     * @param el
     */
    function setEndPoint(endPoint, el)
    {
      var end,
        attachPinLocation,
        x,
        y,
        pin;

      //clears locationIndicators from the maps
      $('g.destinationPin', el).remove();

      if (options.showLocation) {
        end = $('#Points #' + escapeSelector(endPoint), el);

        attachPinLocation = $('svg').has('#Points #' + escapeSelector(endPoint));
        if (end.length) {
          x = (Number(end.attr('cx')));
          y = (Number(end.attr('cy')));

          pin = makePin(x, y, 'destinationPin');

          attachPinLocation.append(pin);
        } else {
          return; //end point does not exist
        }
      }
    } //end function setEndPoint

    /**
     *
     * @param endPoint
     * @param el
     */
    function setLocation(destination, el)
    {
      var end, attachPinLocation,
        x, y, pin;

      //clears locationIndicators from the maps
      $('g.locationPin', el).remove();
      end = $('#Points #' + escapeSelector(destination), el);

      attachPinLocation = $('svg').has('#Points #' + escapeSelector(destination));
      if (end.length) {
        x = (Number(end.attr('cx')));
        y = (Number(end.attr('cy')));

        pin = makePin(x, y, 'locationPin');

        attachPinLocation.append(pin);
      } else {
        return; //end point does not exist
      }
    } //end function setLocation

    /**
     * Set options based on either provided options or defaults
     *
     * @param el
     */
    function getOptions(el)
    {
      var optionsPrior = el.data('wayfinding:options');

      drawing = el.data('wayfinding:drawing'); // load a drawn path, if it exists

      options = $.extend(true, {}, defaults, options);

      // check for settings attached to the current object
      if (optionsPrior !== undefined) {
        options = optionsPrior;
      } else {
        options = $.extend(true, {}, defaults, options);
      }

      // check for settings attached to the current object
      options = $.metadata ? $.extend(true, {}, options, el.metadata()) : options;

      // Create references to the options
      maps = options.maps;

      // set defaultMap correctly, handle both function and value being passed
      if (typeof options.defaultMap === 'function') {
        defaultMap = options.defaultMap();
      } else {
        defaultMap = options.defaultMap;
      }

      // Set startpoint correctly
      if (typeof options.startpoint === 'function') {
        startpoint = options.startpoint();
      } else {
        startpoint = options.startpoint;
      }
    } // end function getOptions

    /**
     *
     * @param el
     */
    function setOptions(el)
    {

      el.data('wayfinding:options', options);
      el.data('wayfinding:drawing', drawing);
      // need to handle cases where WayfindingDataStore isn't loaded if we are separating these out
      el.data('wayfinding:data', dataStore);
    } // end function setOptions

    /**
     * should only be called once instead of twice if initalize and build for non datastore
     *
     * @param el
     */
    function cleanupSVG(el)
    {
      var svg = $(el).find('svg'),
        height = parseInt($(svg).attr('height').replace('px', '').split('.')[0], 10),
        width = parseInt($(svg).attr('width').replace('px', '').split('.')[0], 10);

      // Ensure SVG w/h are divisble by 2 (to avoid webkit blurriness bug on pan/zoom)
      // might need to shift this change to the enclosing element for responsive svgs?
      height = Math.ceil(height / 2) * 2;
      width = Math.ceil(width / 2) * 2;

      $(el).css('padding-bottom', (100 * (height / width)) + '%');

      svg.attr('height', '100%')
      .attr('width', '100%')
      .attr('preserveAspectRatio', 'xMinYMin meet');

      // clean up after illustrator -> svg issues
      $('#Rooms a, #Points circle', el).each(function () {
        if ($(this).prop('id') && $(this).prop('id').indexOf('_') > 0) {
          var oldID = $(this).prop('id');
          $(this).prop('id', oldID.slice(0, oldID.indexOf('_')));
        }
      });
    } //end function cleanupSVG

    /**
     * Ensures '$el' has a valid jQuery.panzoom object
     *
     * @param el
     */
    function initializePanZoom(el)
    {
      el.panzoom({
        minScale: options.panzoom.minScale,
        maxScale: options.panzoom.maxScale,
        contain: options.panzoom.contain,
        cursor: options.panzoom.cursor,
        $zoomIn: options.panzoom.$zoomIn,
        $zoomOut: options.panzoom.$zoomOut,
        $reset: options.panzoom.$reset
      });

      el.on('mousewheel.focal', function(e) {
        e.preventDefault();
        var delta = e.delta || e.originalEvent.wheelDelta;
        var zoomOut = (delta ? delta < 0 : e.originalEvent.deltaY > 0);
        el.panzoom('zoom', zoomOut, {increment: 0.05, animate: false, focal: e});
      });

      // Allow clicking on links within the SVG despite $.panZoom()
      el.find('a').on('mousedown touchstart', function (e) {
        e.stopImmediatePropagation();
      });
    } // end function initializePanZoom

    /**
     * Hide SVG div, hide path lines (they're data, not visuals), make rooms clickable
     *
     * @param el
     * @param svgDiv
     */
    function activateSVG(el, svgDiv)
    {
      // Hide maps until explicitly displayed
      $(svgDiv).hide();

      // Hide route information
      $('#Paths line', svgDiv).attr('stroke-opacity', 0);
      $('#Points circle', svgDiv).attr('fill-opacity', 0);
      $('#Portals circle', svgDiv).attr('fill-opacity', 0);

      // If #Paths, #Points, etc. are in a group, ensure that group does _not_
      // have display: none; (commonly set by Illustrator when hiding a layer)
      // and instead add opacity: 0; (which allows for events, unlike display: none;)
      // (A group tag 'g' is used by Illustrator for layers.)
      var $dataGroup = $('#Paths', svgDiv).parent();
      if ($dataGroup.is('g')) {
        $dataGroup.attr('opacity', 0).attr('display', 'inline');
      }

      // The following need to use the el variable to scope their calls: el is jquery element

      // Make rooms clickable
      $('#Rooms a', svgDiv).click(function (event) {
        $(el).trigger('wayfinding:roomClicked', [{roomId: $(this).attr('id')}]);
        $(el).wayfinding('routeTo', $(this).prop('id'));
        event.preventDefault();
      });

      // Disable clicking on every SVG element except rooms
      $(svgDiv).find('*').css('pointer-events', 'none');
      $('#Rooms a', svgDiv).find('*').css('pointer-events', 'auto');

      $(el).append(svgDiv);

      // jQuery.panzoom() only works after element is attached to DOM
      if (options.pinchToZoom) {
        initializePanZoom($(svgDiv));
      }
    } // end function activateSVG

    /**
     * Called when animatePath() is switching the floor and also when
     *
     * @param floor
     * @param el
     */
    function switchFloor(floor, el)
    {
      var height = $(el).height();

      $(el).height(height); // preserve height as I'm not yet set switching

      $('div', el).hide();

      $('#' + floor, el).show(0, function () {
        $(el).trigger('wayfinding:floorChanged', {mapId: floor});
      });

      // turn floor into mapNum, look for that in drawing
      // if there get drawing[level].routeLength and use that.

      var i, level, mapNum, pathLength;

      if (drawing) {
        mapNum = -1;

        for (i = 0; i < maps.length; i++) {
          if (maps[i] === floor) {
            mapNum = i;
            break;
          }
        }

        level = -1;

        for (i = 0; i < drawing.length; i++) {
          if (drawing[i].floor === mapNum) {
            level = i;
            break;
          }
        }

        if (level !== -1) {
          pathLength = drawing[level].routeLength;

          // these next three are potentially redundant now
          $(drawing[level].path, el).attr('stroke-dasharray', [pathLength, pathLength]);
          $(drawing[level].path, el).attr('stroke-dashoffset', pathLength);
          $(drawing[level].path, el).attr('pathLength', pathLength);
          $(drawing[level].path, el).attr('stroke-dashoffset', pathLength);

          $(drawing[level].path, el).animate({svgStrokeDashOffset: 0}, pathLength * options.path.speed); //or move minPath to global variable?
        }
      }
    } // end function switchFloor

    /**
     *
     * @param el
     */
    function hidePath(el)
    {
      $('path[class^=directionPath]', el).css({
        'stroke': 'none'
      });
    } // end function hidePath

    /**
     * Uses jQuery.panzoom to pan/zoom to the SVG viewbox coordinate equivalent of (x, y, w, h)
     *
     * @param cssDiv
     * @param svg
     * @param x
     * @param y
     * @param w
     * @param h
     */
    function panzoomWithViewBoxCoords(cssDiv, svg, x, y, w, h)
    {
      $(cssDiv).panzoom('resetZoom', false);
      $(cssDiv).panzoom('resetPan', false);

      x = parseFloat(x);
      y = parseFloat(y);
      w = parseFloat(w) ? parseFloat(w) : 1;
      h = parseFloat(h) ? parseFloat(h) : 1;

      var viewBox = svg.getAttribute('viewBox').split(/\s+|,/);
      var viewX = parseFloat(viewBox[0]); // viewBox is [x, y, w, h], x == [0]
      var viewY = parseFloat(viewBox[1]);
      var viewW = parseFloat(viewBox[2]);
      var viewH = parseFloat(viewBox[3]);

      var cssW = $(cssDiv).width();
      var cssH = $(cssDiv).height();

      // Step 1, determine the scale
      var scale = Math.min(( viewW / w ), ( viewH / h )) * options.panzoom.viewboxScale;

      if (scale > 15) scale = 15;

      $(cssDiv).panzoom('zoom', parseFloat(scale));

      // Determine bounding box -> CSS coordinate conversion factor
      var bc = cssW > cssH ? cssH / viewH : cssW / viewW;

      // Step 2, determine the focal
      var bcx = viewX + (viewW / 2); // box center
      var bcy = viewY + (viewH / 2);

      var fx = (bcx - (x + (w / 2))) * bc;
      var fy = (bcy - (y + (h / 2))) * bc;

      // Step 3, apply $.panzoom()
      $(cssDiv).panzoom('pan', fx * scale, fy * scale);
    } // end function panzoomWithViewBoxCoords

    /**
     *
     * @param drawingSegment
     */
    function animatePath(drawingSegment)
    {
      var path,
        svg, svgDiv,
        pathRect,
        drawLength,
        oldViewBox,
        animationDuration,
        pad = options.zoomPadding,
        steps = 35,
        duration = 650, // Zoom animation in milliseconds
        oldView = {},
        newView = {},
        step, directions;

      function adjustIn(current, old, target, count, speed)
      {
        setTimeout(function () {
          var zoomIn = {};
          zoomIn.X = interpolateValue(old.X, target.X, current, count);
          zoomIn.Y = interpolateValue(old.Y, target.Y, current, count);
          zoomIn.W = interpolateValue(old.W, target.W, current, count);
          zoomIn.H = interpolateValue(old.H, target.H, current, count);

          if (options.pinchToZoom) {
            // Use CSS 3-based zooming
            panzoomWithViewBoxCoords($(svg).parent()[0], svg, zoomIn.X, zoomIn.Y, zoomIn.W, zoomIn.H);
          } else {
            // Use SVG viewBox-based zooming
            svg.setAttribute('viewBox', zoomIn.X + ' ' + zoomIn.Y + ' ' + zoomIn.W + ' ' + zoomIn.H);
          }
        }, current * (speed / count) * 10);
      }

      function adjustOut(current, old, target, count, speed)
      {
        setTimeout(function () {
          var zoom = {};
          zoom.X = interpolateValue(target.X, old.X, current, count);
          zoom.Y = interpolateValue(target.Y, old.Y, current, count);
          zoom.W = interpolateValue(target.W, old.W, current, count);
          zoom.H = interpolateValue(target.H, old.H, current, count);

          if (options.pinchToZoom) {
            // Use CSS 3-based zooming
            panzoomWithViewBoxCoords($(svg).parent()[0], svg, zoom.X, zoom.Y, zoom.W, zoom.H);
          } else {
            svg.setAttribute('viewBox', zoom.X + ' ' + zoom.Y + ' ' + zoom.W + ' ' + zoom.H);
          }

          if (current === count) {
            if (drawingSegment === drawing.length) {
              $(obj).trigger('wayfinding:animationComplete');
            }
          }
        }, current * (speed / count));
      }

      function floorChange()
      {
        animatePath(++drawingSegment);

        if (options.zoomToRoute) {
          // Loop the specified number of steps to create the zoom out animation
          // or set step = steps to force the zoom out immediately (used on floors
          // no longer visible to the user due to floor changes)

          // Animate zoom out if we're on the last drawing segment, else
          // we can just reset the zoom out (improves performance, user will never notice)
          if ((drawing.length === 1) || ((drawing.length > 1) && (drawingSegment === drawing.length))) {
            step = 0; // apply full animation
          } else {
            step = steps; // effectively removes animation and resets the zoom out (only triggered on floors where the user
          }

          for (step; step <= steps; step++) {
            adjustOut(step, oldView, newView, steps, duration);
          }
        }
      }

      function toggleStepsButtons()
      {
        var $prevStep = $(options.prevStepTrigger);
        var $nextStep = $(options.nextStepTrigger);

        if(drawing.length > 0) {
          if(drawing[drawingSegment+1] !== undefined) {
            $nextStep.prop('disabled', false);
            $nextStep.on('click', function() {
              floorChange();
            });
          } else {
            $nextStep.prop('disabled', true);
          }

          if(drawing[drawingSegment-1] !== undefined) {
            $prevStep.prop('disabled', false);
            $prevStep.on('click', function() {
              animatePath(drawingSegment-1);
            });
          } else {
            $prevStep.prop('disabled', true);
          }
        }
      }

      if (options.repeat && drawingSegment >= drawing.length) {
        // if repeat is set, then delay and rerun display from first.
        // Don't implement, until we have click to cancel out of this
        setTimeout(function () {
            animatePath(0);
          },
          5000);
      } else if (drawingSegment >= drawing.length) {
        //finished, stop recursion.
        return;
      }

      var mapIdx = drawing[drawingSegment][0].floor;
      svg = $('#' + maps[mapIdx].id + ' svg')[0];
      svgDiv = $($(svg).parent()[0]);
      drawLength = drawing[drawingSegment].routeLength;
      animationDuration = drawLength * options.path.speed;

      switchFloor(maps[drawing[drawingSegment][0].floor].id, obj);

      // Get the complete path for this particular floor-route
      path = $('#' + maps[drawing[drawingSegment][0].floor].id + ' .directionPath' + drawingSegment)[0];

      // Animate using CSS transitions
      // SVG animation technique from http://jakearchibald.com/2013/animated-line-drawing-svg/
      path.style.stroke = options.path.color;
      path.style.strokeWidth = options.path.width;
      path.style.transition = path.style.WebkitTransition = 'none';
      path.style.strokeDasharray = drawLength + ' ' + drawLength;
      path.style.strokeDashoffset = drawLength;
      pathRect = path.getBBox();
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset ' + animationDuration + 'ms linear';
      path.style.strokeDashoffset = '0';

      // If this is the last segment, trigger the 'wayfinding:animationComplete' event
      // when it finishes drawing.
      // If we're using zoomToRoute however, don't trigger here, trigger when zoomOut is complete (see below)
      if (options.zoomToRoute === false) {
        if (drawingSegment === (drawing.length - 1)) {
          $(path).one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function () {
            $(obj).trigger('wayfinding:animationComplete');
          });
        }
      } else {
        if (options.pinchToZoom) {
          panzoomWithViewBoxCoords(svgDiv, svg, pathRect.x, pathRect.y, pathRect.width, pathRect.height);
        } else {
          // Zooming logic...
          // Store the original SVG viewBox in order to zoom out back to it after path animation
          oldViewBox = svg.getAttribute('viewBox');
          oldView.X = parseFloat(oldViewBox.split(/\s+|,/)[0]); // viewBox is [x, y, w, h], x == [0]
          oldView.Y = parseFloat(oldViewBox.split(/\s+|,/)[1]);
          oldView.W = parseFloat(oldViewBox.split(/\s+|,/)[2]);
          oldView.H = parseFloat(oldViewBox.split(/\s+|,/)[3]);

          // Calculate single step size from each direction
          newView.X = ((pathRect.x - pad) > 0) ? (pathRect.x - pad) : 0;
          newView.Y = ((pathRect.y - pad) > 0) ? (pathRect.y - pad) : 0;
          newView.H = pathRect.height + (2 * pad);
          newView.W = pathRect.width + (2 * pad);

          // Loop the specified number of steps to create the zoom in animation
          for (step = 0; step <= steps; step++) {
            adjustIn(step, oldView, newView, steps, duration);
          }
        }
      }


      if(options.autoChangeFloor) {
        // Call animatePath after 'animationDuration' milliseconds to animate the next segment of the path, if any.
        // Note: This is not tiny path 'segments' which form the lines curving around
        //       hallways but rather the other 'paths' needed on other floors, if any.
        setTimeout(function () {
          floorChange();
        }, animationDuration + options.floorChangeAnimationDelay);
      } else {
        if(solution[0].floor !== solution[solution.length -1].floor) {
          toggleStepsButtons()
        }
      }

      if(options.directionsOutput) {
        directions = getWording(solution, mapIdx);
        setRouteMessage(directions);
      }
    } // end function animatePath

    /**
     * Get an array of textual directions for the route
     *
     * @param solution: Quickest path to destination
     * @param currentFloor
     * @returns {Array}
     */
    function getWording(solution, currentFloor)
    {
      var stepLength;
      var distance = 0;
      var angle;
      var directions = [];
      var checkpoint;

      for (var stepNum = 0; stepNum < solution.length; stepNum++) {
        if(solution[stepNum].floor === currentFloor) {
          var direction = '';
          var iconClass = '';
          checkpoint = getCheckpoint(currentFloor, stepNum);
          stepLength = dataStore.p[solution[stepNum].floor][solution[stepNum].segment].l;
          distance += Math.round(stepLength / options.mapRatio);
          angle = getAngle(solution, stepNum);

          switch(true) {
            case (angle < -30 && angle > -120):
              direction = instructions['left'].replace('#{distance}', distance);
              iconClass = '-left';
              distance = 0;
              break;
            case (angle <= -120 && angle > -150):
              direction = instructions['slight_left'].replace('#{distance}', distance);
              iconClass = '-up-left';
              distance = 0;
              break;
            case (angle < 150 && angle >= 120):
              direction = instructions['slight_right'].replace('#{distance}', distance);
              iconClass = '-up-right';
              distance = 0;
              break;
            case (angle < 120 && angle > 30):
              direction = instructions['right'].replace('#{distance}', distance);
              iconClass = '-right';
              distance = 0;
              break;
            case ((angle <= -150 && angle >= -180) || (angle >= 150 && angle <= 180) && checkpoint !== false):
              direction = instructions['straight_by_checkpoint'].replace('#{distance}', distance).replace('#{checkpoint_name}', checkpoint.name);
              iconClass = '-up';
              distance = 0;
              $("#"+checkpoint.id).attr('fill-opacity', 1);
              checkpoint = false;
              break;
            default:
              // Do nothing
              break;
          }

          if(checkpoint) {
            $("#"+checkpoint.id).attr('fill-opacity', 1);
            direction += ' ' + instructions['at'] + ' ' + checkpoint.name;
          }

          if(direction.length > 0) {
            directions.push({ "direction": direction, "iconClass": iconClass });
          }

          if(stepNum === solution.length-1) {
            direction = instructions['arrive_at_dest'];
            iconClass = '-destination';
            directions.push({ "direction": direction, "iconClass": iconClass });
          }
        } else if(directions.length > 0) {
          direction = instructions['change_floor'].replace('#{destination_floor}', dataStore.p[solution[stepNum].floor][solution[stepNum].segment].floor);
          iconClass = '-' + dataStore.q[solution[stepNum].segment].t;
          directions.push({ "direction": direction, "iconClass": iconClass });
          break;
        }
      }
      return directions;
    }

    /**
     * Calculate the angle of a turn in the directions
     *
     * @param solution: Quickest route to destination
     * @param stepNum: Current step
     * @returns {number}: Angle (negative if left turn, positive if right)
     */
    function getAngle(solution, stepNum)
    {
      var ab, bc, ac, cos, angle,
        currSegment, nextSegment,
        ax, ay, bx, by, cx, cy;

      var factor = 1;
      var nextStep = stepNum +1;

      if(solution[nextStep] !== undefined && solution[stepNum].floor === solution[nextStep].floor) {
        currSegment = dataStore.p[solution[stepNum].floor][solution[stepNum].segment];
        nextSegment = dataStore.p[solution[nextStep].floor][solution[nextStep].segment];

        if(currSegment.x === nextSegment.x && currSegment.y === nextSegment.y) {
          ax = parseInt(currSegment.m);
          ay = parseInt(currSegment.n);
          bx = parseInt(currSegment.x);
          by = parseInt(currSegment.y);
          cx = parseInt(nextSegment.m);
          cy = parseInt(nextSegment.n);
        } else if(currSegment.m === nextSegment.x && currSegment.n === nextSegment.y) {
          ax = parseInt(currSegment.x);
          ay = parseInt(currSegment.y);
          bx = parseInt(currSegment.m);
          by = parseInt(currSegment.n);
          cx = parseInt(nextSegment.m);
          cy = parseInt(nextSegment.n);
        } else if(currSegment.x === nextSegment.m && currSegment.y === nextSegment.n) {
          ax = parseInt(currSegment.m);
          ay = parseInt(currSegment.n);
          bx = parseInt(currSegment.x);
          by = parseInt(currSegment.y);
          cx = parseInt(nextSegment.x);
          cy = parseInt(nextSegment.y);
        } else if  (currSegment.m === nextSegment.m && currSegment.n === nextSegment.n) {
          ax = parseInt(currSegment.x);
          ay = parseInt(currSegment.y);
          bx = parseInt(currSegment.m);
          by = parseInt(currSegment.n);
          cx = parseInt(nextSegment.x);
          cy = parseInt(nextSegment.y);
        }

        if(ax !== undefined && ay !== undefined && bx !== undefined && by !== undefined && cx !== undefined && cy !== undefined) {
          ab = Math.sqrt(Math.pow(bx-ax, 2) + Math.pow(by-ay, 2));
          bc = Math.sqrt(Math.pow(bx-cx, 2) + Math.pow(by-cy, 2));
          ac = Math.sqrt(Math.pow(cx-ax, 2) + Math.pow(cy-ay, 2));
          cos = Math.acos((Math.pow(bc,2)+Math.pow(ab, 2)-Math.pow(ac, 2))/(2*bc*ab));
          angle = (cos * 180) / Math.PI;

          // check if left or right turn
          if(( bx > cx && ay > by ) || ( ax > bx && by < cy) || ( bx < cx && ay < by ) || ( ax < bx && by > cy)) {
            factor = -1; // left
          } else if(( bx < cx && ay > by ) || ( ax < bx && by < cy ) || ( bx > cx && ay < by ) || ( ax > bx && by > cy )) {
            factor = 1; // right
          }

          return angle * factor;
        }
      }
      return 0;
    }

    /**
     * Checks if path crosses a checkpoint
     *
     * @param currentFloor
     * @param stepNum: Current step
     * @returns {*}
     */
    function getCheckpoint(currentFloor, stepNum)
    {
      var nextStep = stepNum +1;

      if(solution[nextStep] !==  undefined) {
        var currentSegment = dataStore.p[solution[stepNum].floor][solution[stepNum].segment];
        var mnCurrent = currentSegment.m + '-' + currentSegment.n;
        var xyCurrent = currentSegment.x + '-' + currentSegment.y;
        var nextSegment = dataStore.p[solution[nextStep].floor][solution[nextStep].segment];
        var mnNext = nextSegment.m + '-' + nextSegment.n;
        var xyNext = nextSegment.x + '-' + nextSegment.y;

        if(dataStore.c[currentFloor][mnCurrent] !== undefined && ( mnCurrent === mnNext || mnCurrent === xyNext )) {
          return dataStore.c[currentFloor][mnCurrent];
        } else if(dataStore.c[currentFloor][xyCurrent] !== undefined && ( xyCurrent === xyNext || xyCurrent === mnNext )) {
          return dataStore.c[currentFloor][xyCurrent];
        }
      }
      return false;
    }

    /**
     * The combined routing function
     *
     * @param destination
     * @param el
     */
    function routeTo(destination, el)
    {
      var i,
        draw,
        stepNum,
        level,
        reversePathStart,
        portalsEntered,
        lastStep,
        ax, ay, bx, by,
        aDX, aDY, bDX, bDY,
        cx, cy, px, py,
        curve,
        nx, ny,
        thisPath,
        pick;

      options.endpoint = destination;

      // remove any prior paths from the current map set
      $('path[class^=directionPath]', obj).remove();

      //clear all rooms
      $('#Rooms *.wayfindingRoom', obj).removeAttr('class');

      // hide all checkpoints on map
      $('[data-checkpoint]').attr('fill-opacity', 0);
      solution = [];

      if (startpoint !== destination) {
        // get accessibleRoute option -- options.accessibleRoute

        //highlight the destination room
        $('#Rooms a[id="' + destination + '"] g', obj).attr('class', 'wayfindingRoom');
        setEndPoint(options.endpoint, el);

        solution = getShortestRoute();

        if (reversePathStart !== -1) {
          portalsEntered = 0;
          // Count number of portal trips
          for (i = 0; i < solution.length; i++) {
            if (solution[i].type === 'po') {
              portalsEntered++;
            }
          }

          //break this into a new function?
          drawing = new Array(portalsEntered);
          drawing[0] = [];
          draw = {};

          if (solution.length === 0) {
            console.warn('Attempting to route with no solution. This should never happen. SVG likely has errors. Destination is: ' + destination);
            $(el).trigger('wayfinding:noPossibleRoute', {startpoint: startpoint, endpoint: destination})
            return;
          } else {
            $(el).trigger('wayfinding:possibleRoute', {startpoint: startpoint, endpoint: destination})
          }

          //if statement incorrectly assumes one point at the end of the path, works in that case, need to generalize
          if (dataStore.p[solution[0].floor][solution[0].segment].d[0] === startpoint) {
            draw = {};
            draw.floor = solution[0].floor;
            draw.type = 'M';
            draw.x = dataStore.p[solution[0].floor][solution[0].segment].x;
            draw.y = dataStore.p[solution[0].floor][solution[0].segment].y;
            draw.length = 0;
            drawing[0].push(draw);
            draw = {};
            draw.type = 'L';
            draw.floor = solution[0].floor;
            draw.x = dataStore.p[solution[0].floor][solution[0].segment].m;
            draw.y = dataStore.p[solution[0].floor][solution[0].segment].n;
            draw.length = dataStore.p[solution[0].floor][solution[0].segment].l;
            drawing[0].push(draw);
            drawing[0].routeLength = draw.length;
          } else if (dataStore.p[solution[0].floor][solution[0].segment].e[0] === startpoint) {
            draw = {};
            draw.type = 'M';
            draw.floor = solution[0].floor;
            draw.x = dataStore.p[solution[0].floor][solution[0].segment].m;
            draw.y = dataStore.p[solution[0].floor][solution[0].segment].n;
            draw.length = 0;
            drawing[0].push(draw);
            draw = {};
            draw.type = 'L';
            draw.floor = solution[0].floor;
            draw.x = dataStore.p[solution[0].floor][solution[0].segment].x;
            draw.y = dataStore.p[solution[0].floor][solution[0].segment].y;
            draw.length = dataStore.p[solution[0].floor][solution[0].segment].l;
            drawing[0].push(draw);
            drawing[0].routeLength = draw.length;
          }

          lastStep = 1;

          // for each floor that we have to deal with
          for (i = 0; i < portalsEntered + 1; i++) {
            for (stepNum = lastStep; stepNum < solution.length; stepNum++) {
              if (solution[stepNum].type === 'pa') {
                ax = dataStore.p[solution[stepNum].floor][solution[stepNum].segment].x;
                ay = dataStore.p[solution[stepNum].floor][solution[stepNum].segment].y;
                bx = dataStore.p[solution[stepNum].floor][solution[stepNum].segment].m;
                by = dataStore.p[solution[stepNum].floor][solution[stepNum].segment].n;
                draw = {};

                draw.floor = solution[stepNum].floor;

                if (drawing[i].slice(-1)[0].x === ax && drawing[i].slice(-1)[0].y === ay) {
                  draw.x = bx;
                  draw.y = by;
                } else {
                  draw.x = ax;
                  draw.y = ay;
                }

                draw.length = dataStore.p[solution[stepNum].floor][solution[stepNum].segment].l;
                draw.type = 'L';
                drawing[i].push(draw);
                drawing[i].routeLength += draw.length;
              }

              if (solution[stepNum].type === 'po') {
                drawing[i + 1] = [];
                drawing[i + 1].routeLength = 0;
                // push the first object on
                // check for more than just floor number here....
                pick = '';
                if (dataStore.q[solution[stepNum].segment].g === dataStore.q[solution[stepNum].segment].k) {
                  if (dataStore.q[solution[stepNum].segment].x === draw.x && dataStore.q[solution[stepNum].segment].y === draw.y) {
                    pick = 'B';
                  } else {
                    pick = 'A';
                  }
                } else {
                  if (dataStore.q[solution[stepNum].segment].g === solution[stepNum].floor) {
                    pick = 'A';
                  } else if (dataStore.q[solution[stepNum].segment].k === solution[stepNum].floor) {
                    pick = 'B';
                  }
                }
                if (pick === 'A') {
                  draw = {};
                  draw.floor = solution[stepNum].floor;
                  draw.type = 'M';
                  draw.x = dataStore.q[solution[stepNum].segment].x;
                  draw.y = dataStore.q[solution[stepNum].segment].y;
                  draw.length = 0;
                  drawing[i + 1].push(draw);
                  drawing[i + 1].routeLength = draw.length;
                } else if (pick === 'B') {
                  draw = {};
                  draw.floor = solution[stepNum].floor;
                  draw.type = 'M';
                  draw.x = dataStore.q[solution[stepNum].segment].m;
                  draw.y = dataStore.q[solution[stepNum].segment].n;
                  draw.length = 0;
                  drawing[i + 1].push(draw);
                  drawing[i + 1].routeLength = draw.length;
                }
                lastStep = stepNum;
                lastStep++;
                stepNum = solution.length;
              }
            }
          }

          //go back through the drawing and insert curves if requested
          //consolidate colinear line segments?
          if (options.path.radius > 0) {
            for (level = 0; level < drawing.length; level++) {
              for (i = 1; i < drawing[level].length - 1; i++) {
                if (drawing[level][i].type === 'L' && drawing[level][i].type === 'L') {
                  // check for colinear here and remove first segment, and add its length to second
                  aDX = (drawing[level][i - 1].x - drawing[level][i].x);
                  aDY = (drawing[level][i - 1].y - drawing[level][i].y);
                  bDX = (drawing[level][i].x - drawing[level][i + 1].x);
                  bDY = (drawing[level][i].y - drawing[level][i + 1].y);
                  // if the change in Y for both is Zero
                  if ((aDY === 0 && bDY === 0) || (aDX === 0 && bDX === 0) || ((aDX / aDY) === (bDX / bDY) && !(aDX === 0 && aDY === 0 && bDX === 0 && bDY === 0))) {
                    drawing[level][i + 1].length = drawing[level][i].length + drawing[level][i + 1].length;
                    // drawing[level][i+1].type = "L";
                    drawing[level].splice(i, 1);
                    i = 1;
                  }
                }
              }
              for (i = 1; i < drawing[level].length - 1; i++) {
                // locate possible curves based on both line segments being longer than options.path.radius
                if (drawing[level][i].type === 'L' && drawing[level][i].type === 'L' && drawing[level][i].length > options.path.radius && drawing[level][i + 1].length > options.path.radius) {
                  //save old end point
                  cx = drawing[level][i].x;
                  cy = drawing[level][i].y;
                  // change x,y and change length
                  px = drawing[level][i - 1].x;
                  py = drawing[level][i - 1].y;
                  //new=prior + ((center-prior) * ((length-radius)/length))
                  drawing[level][i].x = (Number(px) + ((cx - px) * ((drawing[level][i].length - options.path.radius) / drawing[level][i].length)));
                  drawing[level][i].y = (Number(py) + ((cy - py) * ((drawing[level][i].length - options.path.radius) / drawing[level][i].length)));
                  //shorten current line
                  drawing[level][i].length = drawing[level][i].length - options.path.radius;
                  curve = {};
                  //curve center is old end point
                  curve.cx = cx;
                  curve.cy = cy;
                  //curve end point is based on next line
                  nx = drawing[level][i + 1].x;
                  ny = drawing[level][i + 1].y;
                  curve.x = (Number(cx) + ((nx - cx) * ((options.path.radius) / drawing[level][i + 1].length)));
                  curve.y = (Number(cy) + ((ny - cy) * ((options.path.radius) / drawing[level][i + 1].length)));
                  //change length of next segment now that it has a new starting point
                  drawing[level][i + 1].length = drawing[level][i + 1].length - options.path.radius;
                  curve.type = 'Q';
                  curve.floor = drawing[level][i].floor;
                  // insert curve element
                  // splice function on arrays allows insertion
                  //   array.splice(start, delete count, value, value)
                  // drawing[level].splice(current line, 0, curve element object);

                  drawing[level].splice(i + 1, 0, curve);

                } // both possible segments long enough
              } // drawing segment
            } // level
          } // if we are doing curves at all

          $.each(drawing, function (j, map) {
            var path = '',
              newPath;

            $.each(map, function (k, stroke) {
              switch (stroke.type) {
                case 'M':
                  path = 'M' + stroke.x + ',' + stroke.y;
                  break;
                case 'L':
                  path += 'L' + stroke.x + ',' + stroke.y;
                  break;
                case 'Q':
                  path += 'Q' + stroke.cx + ',' + stroke.cy + ' ' + stroke.x + ',' + stroke.y;
                  break;
              }
            });

            newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            newPath.setAttribute('d', path);
            newPath.style.fill = 'none';

            if (newPath.classList) {
              newPath.classList.add('directionPath' + j, 'directionPathSVG');
            } else {
              newPath.setAttribute('class', 'directionPathSVG directionPath' + j );
            }

            // Attach the newpath to the startpin or endpin if they exist on this floor
            var attachPointSvg = $('#' + maps[map[0].floor].id + ' svg');
            var startPin = $('.startPin', attachPointSvg);
            var destinationPin = $('.destinationPin', attachPointSvg);

            if (startPin.length) {
              startPin.before(newPath);
            }
            else if (destinationPin.length) {
              destinationPin.before(newPath);
            }
            else {
              attachPointSvg.append(newPath);
            }

            thisPath = $('#' + maps[map[0].floor].id + ' svg .directionPath' + j);

            drawing[j].path = thisPath;
          });

          animatePath(0);

          //on switch which floor is displayed reset path svgStrokeDashOffset to minPath and the reanimate
          //notify animation loop?
        }
      }
    } //end function RouteTo

    /**
     * Create a list of textual indications for the route
     *
     * @param directions: Array containing directions returned by getWording()
     */
    function setRouteMessage(directions)
    {
      if(directions.length > 0) {
        var html = '<ol type="'+options.directionsOlType+'" class="'+options.directionsClass+'">';
        for(var i = 0; i < directions.length; i++) {
          html += '<li class="'+directions[i].iconClass+'">' + directions[i].direction + '</li>';
        }
        html += '</ol>';
        $(options.directionsContainer).html(html);
      }
    }

    /**
     * Load the current languages texts
     *
     * @param lang
     */
    function getInstructions(lang)
    {
      var translations = {
        'en': {
          "slight_left": "Walk #{distance} meters and take a slight left",
          "left": "Walk #{distance} meters and turn left",
          "slight_right": "Walk #{distance} meters and take a slight right",
          "right": "Walk #{distance} meters and turn right",
          "straight_by_checkpoint": "Walk #{distance} meters and continue past the #{checkpoint_name}",
          "arrive_at_dest": "You have arrived at your destination",
          "change_floor": "Go the floor #{destination_floor}",
          "at": "at"
        },
        'fr': {
          "slight_left": "Marchez #{distance} mètres puis tournez légèrement à gauche",
          "left": "Marchez #{distance} mètres puis tournez à gauche",
          "slight_right": "Marchez #{distance} mètres puis tournez légèrement à droite",
          "right": "Marchez #{distance} mètres puis tournez à droite",
          "straight_by_checkpoint": "Marchez #{distance} mètres et continuez passé le #{checkpoint_name}",
          "arrive_at_dest": "Vous êtes arrivé à votre destination",
          "change_floor": "Rendez-vous à l'étage #{destination_floor}",
          "at": "au"
        }
      };
      instructions = translations[lang];
    }
    /**
     *
     * @param el
     */
    function replaceLoadScreen(el)
    {
      var displayNum,
        mapNum;

      $('#WayfindingStatus').remove();

      // loop ensures defaultMap is in fact one of the maps
      displayNum = 0;
      for (mapNum = 0; mapNum < maps.length; mapNum++) {
        if (defaultMap === maps[mapNum].id) {
          displayNum = mapNum;
        }
      }

      // highlight starting floor
      $('#' + maps[displayNum].id, el).show();

      $(el).trigger('wayfinding:mapsVisible');

      // if endpoint was specified, route to there.
      if (typeof options.endpoint === 'function') {
        routeTo(options.endpoint(), el);
      } else if (typeof options.endpoint === 'string') {
        routeTo(options.endpoint, el);
      }

      $.event.trigger('wayfinding:ready');
    } // end function replaceLoadScreen

    /**
     * Initialize the jQuery target object
     *
     * @param el
     * @param cb
     */
    function initialize(el, cb)
    {
      var mapsProcessed = 0;

      $('div:not("#WayfindingStatus")', el).remove();

      // Load SVGs off the network
      $.each(maps, function (i, map) {

        var svgDiv = $('<div id="' + map.id + '"><\/div>');

        //create svg in that div
        svgDiv.load(
          map.path,
          function (svg, status) {
            if (status === 'error') {
              svgDiv.html('<p class="text-center text-danger">Map ' + i + ' Was not found at ' +
                map.path + '<br />Please upload it in the administration section</p>');
              maps[i].el = svgDiv;
            } else {
              maps[i].svgHandle = svg;
              maps[i].el = svgDiv;

              cleanupSVG(maps[i].el);

              activateSVG(el, svgDiv);

              mapsProcessed += 1;
            }

            if (mapsProcessed === maps.length) {
              // All SVGs have finished loading
              establishDataStore(function () {
                // SVGs are loaded, dataStore is set, ready the DOM
                setStartPoint(startpoint, el);
                setOptions(el);
                replaceLoadScreen(el);
                if (typeof cb === 'function') {
                  cb();
                }
              });
            }
          }
        );
      });
    } // end function initialize

    if (action && typeof (action) === 'object') {
      if (typeof options === 'function') {
        callback = options;
      }
      options = action;
      passed = action;
      action = 'initialize';
    }

    // for each jQuery target object
    this.each(function () {
      // store reference to the currently processing jQuery object
      obj = $(this);

      getOptions(obj); // load the current options

      // Handle actions
      if (action && typeof (action) === 'string') {
        switch (action) {
          /**
           * @function wayfinding
           * @memberOf wayfinding
           * @param {object} settings an object holding the settings to initialize the plugin with
           * @param {function} [callback] optional callback that gets called once setup is completed.
           */

          case 'initialize':
            if (passed && passed.maps) {
              checkIds(obj);
              initialize(obj, callback);
            } else {
              if (passed && passed.showLocation !== undefined) {
                options.showLocation = passed.showLocation;
                setStartPoint(options.startpoint, obj);
              }
            }
            break;

          /**
           * @function routeTo
           * @name routeTo
           * @public
           * @memberOf wayfinding
           * @example $('target').wayfinding('routeTo', 'pointID');
           */
          case 'routeTo':
            // call method
            routeTo(passed, obj);
            break;

          /**
           * @function findPoint
           * @name findPoint
           * @public
           * @memberOf wayfinding
           * @example $('target').wayfinding('findPoint', 'pointID');
           */
          case 'findPoint':
            // call method
            switchFloor($("#"+passed).parents('div').prop('id'), obj);
            setLocation(passed, obj);
            break;

          /**
           * @function animatePath
           * @memberOf wayfinding
           * @example $('target').wayfinding('animatePath');
           */
          /**
           * @todo add callback to animatePath
           */
          case 'animatePath':
            hidePath(obj);
            animatePath(0);
            break;

          /**
           * @function startpoint
           * @memberOf wayfinding
           * @param {string} newStartPoint a point ID specifying a new starting location
           * @param {function} [callback]
           * @example $('target').wayfinding('startpoint', 'R1001');
           * @example $('target').wayfinding('startpoint', startpointFunction);
           */
          case 'startpoint':
            // change the startpoint or startpoint for the instruction path
            if (passed === undefined) {
              result = startpoint;
            } else {
              setStartPoint(passed, obj);
              establishDataStore(callback);
            }
            break;

          case 'currentMap':
            // return and set
            if (passed === undefined) {
              result = $('div:visible', obj).prop('id');
            } else {
              switchFloor(passed, obj);
            }
            break;

          case 'accessibleRoute':
            // return and set
            if (passed === undefined) {
              result = options.accessibleRoute;
            } else {
              options.accessibleRoute = passed;
              establishDataStore(callback);
            }
            break;

          /**
           * @function path
           * @name path
           * @memberOf wayfinding
           * @param {pathtype} nameNotSpecified sets options.path
           * @Returns optional path if no param is passed
           * @example getPath = $('target').wayfinding('path');
           */
          case 'path':
            // return and set
            if (passed === undefined) {
              result = options.path;
            } else {
              options.path = $.extend(true, {}, options.path, passed);
            }
            break;

          /**
           * @function getDataStore
           * @name getDataStore
           * @memberOf wayfinding
           * @returns {string} a JSON object representing the current state of the map for a given startpoint and accessibility setting
           * @example capture = $('target').wayfinding('getDataStore');
           */
          case 'getDataStore':
            //shows JSON version of dataStore when called from console.
            //To facilitate caching dataStore.
            result = JSON.stringify(dataStore);
            break;
          case 'destroy':
            //remove all traces of wayfinding from the obj
            $(obj).remove();
            break;
          default:
            break;
        }
      }

      setOptions(obj);
    });

    if (result !== undefined) {
      return result;
    }

    return this;
  };
}(jQuery));
//  ]]>
