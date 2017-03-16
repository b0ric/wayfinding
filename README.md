# Wayfinding

jQuery plugin for interactive SVG maps. Wayfinding provides the shortest route through a series of one or more svg maps. It supports client side map processing or pretraversal of the maps with the server holding the cached traversals. It is useful for kiosks and interactive digital signage, but can also be used to share mobile maps.

# O2web version

## SVG Format

### Base

Wrapper for the background image of the map

```
<g id="Base">
	SVG map content here...
</g>
```

### Portals

Their id needs to be created using a specific format (ex: Elev.1.floor3). 

* The first part (Elev) is ~~used to determine the type of portal~~ not used anymore. To determine the type, use `data-portal-type` attribute.
* The second part (1) is used to link portals together (must be unique for each portal group)
* The third part (floor3) is used to set the map where the portal leads.

You can remove a portal from the accessible routes by setting the attribute `data-accessible-route` to false. 

```
<g id="Portals">
	<circle id="Elev.1.floor2" cx="297" cy="237" r="2" />
	<circle id="Stair.2.floor2" cx="297" cy="273" r="2" data-accessible-route="false"/>
</g>
```

### Paths

You can remove a path from the accessible routes by setting the attribute `data-accessible-route` to false. 

```
<g id="Paths">
	<line fill="none" stroke="#00FFFF" x1="297" y1="273" x2="315" y2="273"/>
	<line data-accessible-route="false" fill="none" stroke="#FF0000" x1="342" y1="264" x2="342" y2="336"/>
</g>
```
	
### Points

Use the `data-destination` attribute to set a point as a destination. If the attribute is not present, the points will simply be ignored.

```
<g id="Points">
	<circle data-destination="" id="lobby" cx="297" cy="408" r="2"/>
	<circle data-destination="" id="R121_1_" cx="117" cy="156" r="2"/>
</g>
```

### Checkpoints

Use the `data-checkpoint` attribute to set a checkpoint in a path. Those checkpoints will provide more informations on your route. They will be shown if the route has a common intersection with the checkpoint.

```
<g id="Points">
    <circle id="cp-123" data-checkpoint="" data-name="Checkpoint1" cx="342" cy="381" r="5"/>
</g>
```

## Plugin options
### Wayfinding Params

|Setting|Default|Description|
|---|---|---|
|maps|`[{'path': 'floorplan.svg', 'id': 'map.1'}]`|List of maps (path to file and id)|
|path|`{color: 'red', radius: 10, speed: 8, width: 3 }`|Params for the path styles|
|startpoint|`'startpoint': function () { 'startpoint'; }`|Start point for the path|
|endpoint|`false`|End point for the path|
|accessibleRoute|`false`|Should the path use only accessible routes|
|defaultMap|`function () { return 'map.1'; }`|Map loaded by default|
|loadMessage|Loading|Message shown when maps are loading|
|dataStoreCache|`null`||
|showLocation|`false`|| 
|locationIndicator|`{ startPin: { fill: 'red', letterFill: 'white', height: 100 }, destinationPin: { fill: 'blue', letterFill: 'white', height: 100 }`|Params for the location indicator pointer styles|
|pinchToZoom|`false`|Should pinch to zoom be activated (requires jquery.panzoom)|
|zoomToRoute|`false`|Should zoom to route be activated (requires jquery.panzoom)|
|panzoom|`{minScale: 1, maxScale: 30, viewboxScale: 1, contain: 'invert', cursor: 'pointer', $zoomIn: $(), $zoomOut: $(), $reset: $()}`|Params used for panzoom|
|zoomPadding|25|Padding when zoomed in|
|autoChangeFloor|`true`|Should floor change be automatic|
|floorChangeAnimationDelay|1250|Milliseconds to wait during animation when a floor change occurs (if `autoChangeFloor` is set to true)|
|prevStepTrigger|`#prev-step`|If `autoChangeFloor` is set to false, element that triggers return to previous step|
|nextStepTrigger|`#next-step`|If `autoChangeFloor` is set to false, element that triggers change to next step|

### Directions output options

|Setting|Default|Description|
|---|---|---|
|directionsOutput|`true`|Should textual direction output be enabled|
|directionsContainer|`#directions`|Selector for element where directions will be output|
|directionClass|''|Class for the `<ul>` containing the directions|
|directionOlType|`a`|Type of list element for the `<ol>`. See [https://www.w3schools.com/tags/att_ol_type.asp]() for possible values.|
|directionsLanguage|`en`|Language used for the textual directions.|
|mapRatio|7|Ratio for the map, used to calculate distances for textual directions|


### SVG attributes

|Attribute|Element|Effect|
|---|---|---|
|`data-destination`|Point|Used to differentiate destination points from normal points|
|`data-accessible-route`|Portal, Path|If set to false, the element will be ignored when looking for an accessible route.|
|`data-portal-type`|Portal|Type of portal. Possible values `stairs`, `elevator`, `escalator`, `door` and `portal`. If no value is set, `portal` will be used.|
|`data-checkpoint`|Point/Checkpoint|Transform the point into a checkpoint|
|`data-name`|Checkpoint|Will be shown in the textual directions of the route.|

# Credits

* Developed at the UCD School of Law: [https://law.ucdavis.edu/information-technology/projects/wayfinding.html](https://law.ucdavis.edu/information-technology/projects/wayfinding.html)
* Additional contributions from UCD Division of Social Science IT: [https://it.dss.ucdavis.edu/](https://it.dss.ucdavis.edu/)
* Demo will be placed at : [http://ucdavis.github.io/wayfinding/](http://ucdavis.github.io/wayfinding/) -- demo to be incorporated into this project and revamped to be part of tests
