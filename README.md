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

* The first part (Elev) is used to determine the type of portal.
* The second part (1) is used to link portals together
* The third part (floor3) is used to set the map where the portal leads.

You can remove a portal from the accessible routes by setting the attribute `data-accessible-route` to false. 

```
<g id="Portals">
	<circle id="Elev.1.floor2" cx="297" cy="237" r="2" />
	<circle id="Stair.1.floor2" cx="297" cy="273" r="2" data-accessible-route="false"/>
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
|locationIndicator|`{fill: 'red', height: 40 }`|Params for the location indicator pointer styles|
|pinchToZoom|`false`|Should pinch to zoom be activated (requires jquery.panzoom)|
|zoomToRoute|`false`|Should zoom to route be activated (requires jquery.panzoom)|
|zoomPadding|25|Padding when zoomed in|
|autoChangeFloor|`true`|Should floor change be automatic|
|floorChangeAnimationDelay|1250|Milliseconds to wait during animation when a floor change occurs (if `autoChangeFloor` is set to true)|
|changeFloorTrigger|`#change-floor`|If `autoChangeFloor` is set to false, which element triggers the change manually|

### SVG attributes

|Attribute|Element|Effect|
|---|---|---|
|`data-destination`|Point|Used to differentiate destination points from normal points|
|`data-accessible-route`|Portal, Path|If set to false, the element will be ignored when looking for an accessible route.|

# Credits

* Developed at the UCD School of Law: [https://law.ucdavis.edu/information-technology/projects/wayfinding.html](https://law.ucdavis.edu/information-technology/projects/wayfinding.html)
* Additional contributions from UCD Division of Social Science IT: [https://it.dss.ucdavis.edu/](https://it.dss.ucdavis.edu/)
* Demo will be placed at : [http://ucdavis.github.io/wayfinding/](http://ucdavis.github.io/wayfinding/) -- demo to be incorporated into this project and revamped to be part of tests
