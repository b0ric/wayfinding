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
      fill: 'red',
      height: 40
    },
    'pinchToZoom': false, // requires jquery.panzoom
    'zoomToRoute': false,
    'zoomPadding': 25,
    'autoChangeFloor': false, // change floor automatically or require a user's action
    'changeFloorTrigger': '#change-floor',
    'floorChangeAnimationDelay': 1250 // milliseconds to wait during animation when a floor change occurs
  },
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
        circle,
        height = options.locationIndicator.height, // add error checking?
        symbolPath;

      indicator = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      $(indicator).attr('class', type);

      pin = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

      symbolPath = 'M0.075,0';
      symbolPath += 'c-2.079-10.207-5.745-18.703-10.186-26.576c-3.295-5.84-7.111-11.23-10.642-16.894c-1.179-1.891-2.196-3.888-3.327-5.85';
      symbolPath += 'c-2.266-3.924-4.102-8.472-3.984-14.372c0.113-5.766,1.781-10.391,4.186-14.172c3.954-6.219,10.578-11.317,19.465-12.657';
      symbolPath += 'c7.268-1.095,14.08,0.756,18.911,3.58c3.948,2.31,7.005,5.394,9.329,9.027c2.426,3.793,4.096,8.274,4.236,14.12';
      symbolPath += 'c0.072,2.995-0.418,5.769-1.109,8.069c-0.699,2.328-1.823,4.274-2.824,6.353c-1.953,4.06-4.4,7.777-6.857,11.498';
      symbolPath += 'C9.954,-26.789,3.083,-15.486,0.075,0z';

      pin.setAttribute('d', symbolPath);
      pin.setAttribute('fill', '#E81E25');
      pin.setAttribute('stroke', '#000000');
      pin.setAttribute('stroke-width', '3.7');
      pin.setAttribute('stroke-miterlimit', '10');

      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '-63.757');
      circle.setAttribute('r', '9.834');

      indicator.appendChild(pin);
      indicator.appendChild(circle);

      indicator.setAttribute('transform', 'translate(' + x + ' ' + (y - 10 * (height / 125)) + ') scale(' + height / 125 + ')');

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
        matches, portal, portalId, ar;

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
          q: [] // connected portals
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
          type: portalId.split('.')[0],
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
        'q': [] // portals
      };

      portalSegments = [];

      // Build the dataStore from each map given
      $.each(maps, function (i, map) {
        buildDataStore(i, map, map.el);
      });

      buildPortals();
      generateRoutes();

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

        attachPinLocation = $('svg').has('#Rooms a[id="' + escapeSelector(endPoint) + '"]');
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
        minScale: 1.0,
        contain: 'invert',
        cursor: 'pointer'
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

      //turn floor into mapNum, look for that in drawing
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

      x = parseFloat(x);
      y = parseFloat(y);
      w = parseFloat(w);
      h = parseFloat(h);

      var viewBox = svg.getAttribute('viewBox');
      var viewX = parseFloat(viewBox.split(/\s+|,/)[0]); // viewBox is [x, y, w, h], x == [0]
      var viewY = parseFloat(viewBox.split(/\s+|,/)[1]);
      var viewW = parseFloat(viewBox.split(/\s+|,/)[2]);
      var viewH = parseFloat(viewBox.split(/\s+|,/)[3]);

      var cssW = $(cssDiv).width();
      var cssH = $(cssDiv).height();

      // Step 1, determine the scale
      var scale = Math.min(( viewW / w ), ( viewH / h ));

      $(cssDiv).panzoom('zoom', parseFloat(scale));

      // Determine bounding box -> CSS coordinate conversion factor
      var bcX = cssW / viewW;
      var bcY = cssH / viewH;

      // Step 2, determine the focal
      var bcx = viewX + (viewW / 2); // box center
      var bcy = viewY + (viewH / 2);

      var fx = (bcx - (x + (w / 2))) * bcX;
      var fy = (bcy - (y + (h / 2))) * bcY;

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
        svg,
        pathRect,
        drawLength,
        oldViewBox,
        animationDuration,
        pad = options.zoomPadding,
        steps = 35,
        duration = 650, // Zoom animation in milliseconds
        oldView = {},
        newView = {},
        step;

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
        }, current * (speed / count));
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


      if(options.autoChangeFloor) {
        // Call animatePath after 'animationDuration' milliseconds to animate the next segment of the path,
        // if any.
        // Note: This is not tiny path 'segments' which form the lines curving around
        //       hallways but rather the other 'paths' needed on other floors, if any.
        setTimeout(function () {
          floorChange();
        }, animationDuration + options.floorChangeAnimationDelay);
      } else {
        if(solution[0].floor !== solution[solution.length -1].floor) {
          var $trigger = $(options.changeFloorTrigger);
          $trigger.show();
          $trigger.on('click', function() {
            floorChange();
            $(this).hide();
          });
        }
      }
    } // end function animatePath

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
          drawing = new Array(portalsEntered); // Problem at line 707 character 40: Use the array literal notation [].
          drawing[0] = [];
          draw = {};

          if (solution.length === 0) {
            console.warn('Attempting to route with no solution. This should never happen. SVG likely has errors. Destination is: ' + destination);
            return;
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
              newPath.classList.add('directionPath' + j);
            } else {
              newPath.setAttribute('class', 'directionPath' + j);
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
