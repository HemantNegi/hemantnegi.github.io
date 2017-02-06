/****
Plot points on google maps using apis

- Initialize this script after loading google maps js
****/
AQI = {

  init: function() {
    this.create_map();
    //this.set_user_location();
    this.expandCollapse();
    //this.set_user_location();


    //this.marker.add(28.4605837,77.0484099, {txt: "You", type:0})

    //this.fetch_waqi_data();

    // navigation code init
    routeBoxer = new RouteBoxer();
    this.autocompleteDirectionHandler();


    // init vehicle type.
    VT.init();
  },

  set_user_location: function() {
    var self = this;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
          self.CURRENT_POS = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)

          // set current location on map.
          self.map.setCenter(self.CURRENT_POS);
          self.marker.add(self.CURRENT_POS, {
            txt: "You",
            type: 0
          });
        },
        function(a) {
          console.error("error in getting user location");
        }, {
          timeout: 10000
        }
      );
    } else {
      alert('Unable to get current location. Unsupported Browser!');
    }
  },

  map: null,
  points_mode: 0, // 0- enabled point mode| 1 = disable point mode on next request | 2 = disabled point mode
  switch_mode: function(mode){
    // mode = true to hide all points and show only on the path.
    var markers = this.marker.markers;
    if(mode){
      // hide markers from map
      this.points_mode = 2;
      for(var i=0; i<markers.length; i++)
        $(markers[i].div_).hide();
    }
    else{
      this.points_mode = 0;
      for(var i=0; i<markers.length; i++)
        $(markers[i].div_).show();
    }
  },

  create_map: function() {
    var opts = {
      zoom: 10,
      scrollwheel: true,
      center: new google.maps.LatLng(28.4605837, 77.0484099),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControlOptions: {
        mapTypeIds: []
      },
      streetViewControl: false
    }

    this.map = new google.maps.Map(document.getElementById("map"), opts);
    this.marker.init(this.map);

    this.register_map_events(this.map);
  },

  register_map_events: function(map) {
    var self = this;

    // bounds changed
    map.addListener('bounds_changed', function() {
      var bounds = AQI.map.getBounds();
      bounds = {
        topright: {
          lat: bounds.getNorthEast().lat(),
          lng: bounds.getNorthEast().lng()
        },
        bottomleft: {
          lat: bounds.getSouthWest().lat(),
          lng: bounds.getSouthWest().lng()
        }
      }
      self.fetch_waqi_data(bounds);
    })
  },

  marker: {
    /**
    To add a marker to maps
    marker.add(latlng, data);
    **/
    has_initialized: !1,
    markers: [],

    init: function(map) {
      if (!this.has_initialized) {
        this.setup(map);
        this.has_initialized = !0;
      }
    },

    setup: function(map) {
      this.CustomMarker = function(latlng, data) {
        this.latlng_ = latlng
        this.data = data;
        this.setMap(map);
      }
      
      this.CustomMarker.prototype = new google.maps.OverlayView();

      this.CustomMarker.prototype.draw = function() {
        var me = this;

        // Check if the div has been created.
        var div = this.div_;
        if (!div) {

          div = $('<div class="marker level' + me.data.type + '"><span>' + me.data.txt + '</span></div>');

          //          div.on('click', function() {
          //            window.open(me.data.txt, '_blank');
          //          });

          if (me.data.type != 0) {
            div.on('click',
              //Mouse Enter Event
              function() {
                if (!$('.sr_res.marker_hover').length) {
                  $('body').append(
                  	'<section class="sr_res marker_hover"><span class="close-icon"></span><ol></ol><ol></ol>' +
                  	'<div class="anc"></div>' + '</section>');
                }

				var close = $('.close-icon');
				close.on('click', function() {
				  $('.sr_res.marker_hover').hide();
				});
                var mp = $('.sr_res.marker_hover');                
                allOls = mp.find('ol');
                anchorDiv = mp.find('.anc');
                allOls[0].innerHTML = '<span class="air-icon"></span><span class="label">Air Quality: </span><span>' + me.data.msg  + ' ('+ me.data.txt +')';
                allOls[1].innerHTML = '<span class="health-icon"></span><span class="label">Health advisory: </span><span>' + me.data.rec + '</span>';
              	var anchors = '<div class="ads-container level' + me.data.type + '"><a class="ads-anchor" target="_blank" href='+ me.data.ads[0]['url'] + '>' +
								  '<div class="ads"><div class="img-container">' +
								  '<img src="' + me.data.ads[0]['image_path'] +  '" class="small-img "></div><div>'+ me.data.ads[0]['title'] + '</div></div></a>' +
                	'<a class="ads-anchor center" target="_blank" href=' + me.data.ads[1]['url'] + '>' +
								  '<div class="ads"><div class="img-container">' +
								  '<img src="'+ me.data.ads[1]['image_path'] + '" class="small-img "></div><div>'+ me.data.ads[1]['title'] + '</div></div></a>' +
                	'<a class="ads-anchor" target="_blank" href='+ me.data.ads[2]['url'] +'>' +
								  '<div class="ads"><div class="img-container">' +
								  '<img src="' + me.data.ads[2]['image_path'] + '" class="small-img "></div><div>'+ me.data.ads[2]['title'] + '</div></div></a></div>'
								anchorDiv[0].innerHTML = anchors;
                mp.css({
                  top: $(this).offset().top + 35,
                  left: $(this).offset().left + 35
                });
                mp.fadeIn(300);
              });
          }

          // Then add the overlay to the DOM
          var panes = this.getPanes();
          panes.overlayImage.appendChild(div[0]);

          if(me.data.type == 0)
            div.css({'z-index':'1200'});

          this.div_ = div;
        }

        // Position the overlay
        var point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
        if (point) {
          div.css({
            left: point.x,
            top: point.y
          });
        }
      };

      this.CustomMarker.prototype.remove = function() {
        $(this.div_).remove();
      }
    },

    add: function(l, d, o = null) {
      /**
        add(google.maps.LatLng, data)
        OR
        add(lat, lng, data)
      **/
      var mark = null;
      if (typeof(l) === "object") {
        mark = new this.CustomMarker(l, d);
      } else {
        var l = new google.maps.LatLng(l, d)
        mark = new this.CustomMarker(l, o);
      }

      // used to erase points.
      this.markers.push(mark);
      return mark;
    },

    clear_all: function() {
      while (this.markers.length) {
        this.markers.pop().setMap(null);
      }
    }

    //var latlngbounds = new google.maps.LatLngBounds();

    /* for (i in SQ.MAP_DATA) {
                SQ.MAP_DATA[i].ll = new google.maps.LatLng(SQ.MAP_DATA[i].ll[1], SQ.MAP_DATA[i].ll[0])
                new CustomMarker(SQ.MAP_DATA[i], map);
                latlngbounds.extend(SQ.MAP_DATA[i].ll);
            }
            */
    //   map.fitBounds(latlngbounds);
  },

  waqi_throttle: null,
  fetch_waqi_data: function(bounds) {
    var self = this;

    clearTimeout(self.waqi_throttle);

    self.waqi_throttle = setTimeout(function(){

        if(self.points_mode == 2) return; // if its not in navigation mode only then load data.
        //if(self.points_mode == 1){ self.points_mode=2;}

        var endpoint = 'http://api.waqi.info/map/bounds/?latlng='
        endpoint += bounds.bottomleft.lat + ',' + bounds.bottomleft.lng + ',' //'28.359984824037397,76.85897827148438,'  // bottom left of viewport
        endpoint += bounds.topright.lat + ',' + bounds.topright.lng //'28.794139286043002,77.50717163085936'   // top tight of viewport
        endpoint += '&inc=placeholders&token=362cf8329f2f1631f93220ba9cac058f3091430d'

        $.get(endpoint, function(d) {
          if (d.status == 'ok') {

            //clear previous data_points first.
            self.marker.clear_all();
            for (i = 0; i < d.data.length; i++) {
              var data = d.data;
              //generate_aqi_data(data);


              data = self.air_quality(d.data[i].aqi)
              self.marker.add(d.data[i].lat, d.data[i].lon, data)
            }

            if(self.points_mode == 1){
                setTimeout(function(){
                    self.switch_mode(true);
                    self.find_best_route();
                },1000);
            }
          }
        });
    },200);

  },

  generate_aqi_data: function() {
    /***
    Reduce the gis data
    **/

    d = [{
        lat: 28.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 27.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 29.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 30.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 25.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 27.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 29.359984824037397,
        lon: 76.85897827148438
      },
      {
        lat: 30.359984824037397,
        lon: 76.85897827148438
      },
    ]

    // retrive min and max coords in the range.
    max_lat = max_lon = 0;
    min_lat = min_lon = 10000; // some arbitrary large number.
    for (i = 0; i < d.length; i++) {
      if (max_lat < d[i].lat) max_lat = d[i].lat;
      if (min_lat > d[i].lat) min_lat = d[i].lat;
      if (max_lon < d[i].lon) max_lon = d[i].lon;
      if (min_lon > d[i].lon) min_lon = d[i].lon;
    }

    function gen_random_points(ref) {
      return ref + Math.random()
    }

    var fake_data = [];
    var points_count = 100;
    for (i - 0; i < points_count; i++)
      fake_data.push({
        lat: gen_random_points(min_lat),
        lon: gen_random_points(min_lon)
      })

    console.log(fake_data);

  },

  air_quality: function(aqi) {
    // REF : https://airnow.gov/index.cfm?action=aqibasics.aqi
    aqi = parseInt(aqi);
    if (!aqi) aqi = '-';
    var data = {
      txt: aqi
    }
    if (aqi <= 50) {
      data.type = 1
      data.msg = 'Good'
      data.rec = 'Excellent air quality, enjoy the environment.'
      data.ads = [{
      	'url': 'http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&ie=UTF8&qid=1485176735&sr=1-8&keywords=air+quality+monitor',
      	'title': 'Purifier',
      	'image_path': 'static/images/air_purifier.jpg'
      }, {
      	'url': 'http://www.amazon.in/Honeywell-anti-pollution-foldable-face-mask/dp/B01AJI0QF6/ref=sr_1_4?ie=UTF8&qid=1485177485&sr=8-4&keywords=mask+air+pollution',
      	'title': 'Mask',
      	'image_path': 'static/images/mask.jpg'
      }, {
      	'url': 'http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2',
      	'title': 'Sensor',
      	'image_path': 'static/images/dust_sensor.jpg'
      }]
    } else if (aqi > 50 && aqi <= 100) {
      data.type = 2
      data.msg = 'Moderate'
      data.rec = 'You should close your windows while driving and turn off the fans.'
      data.ads = [{
      	'url': 'http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&ie=UTF8&qid=1485176735&sr=1-8&keywords=air+quality+monitor',
      	'title': 'Purifier',
      	'image_path': 'static/images/air_purifier.jpg'
      }, {
      	'url': 'http://www.amazon.in/Honeywell-anti-pollution-foldable-face-mask/dp/B01AJI0QF6/ref=sr_1_4?ie=UTF8&qid=1485177485&sr=8-4&keywords=mask+air+pollution',
      	'title': 'Mask',
      	'image_path': 'static/images/mask.jpg'
      }, {
      	'url': 'http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2',
      	'title': 'Sensor',
      	'image_path': 'static/images/dust_sensor.jpg'
      }]
    } else if (aqi > 100 && aqi <= 150) {
      data.type = 3
      data.msg = 'Unhealthy for Sensitive Groups'
      data.rec = 'You might feel a burning sensation, wheezing and shortness of breath. Avoid idling and combine errands into one trip.'
      data.ads = [{
      	'url': 'http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&ie=UTF8&qid=1485176735&sr=1-8&keywords=air+quality+monitor',
      	'title': 'Purifier',
      	'image_path': 'static/images/air_purifier.jpg'
      }, {
      	'url': 'http://www.amazon.in/Honeywell-anti-pollution-foldable-face-mask/dp/B01AJI0QF6/ref=sr_1_4?ie=UTF8&qid=1485177485&sr=8-4&keywords=mask+air+pollution',
      	'title': 'Mask',
      	'image_path': 'static/images/mask.jpg'
      }, {
      	'url': 'http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2',
      	'title': 'Sensor',
      	'image_path': 'static/images/dust_sensor.jpg'
      }]
    } else if (aqi > 150 && aqi <= 200) {
      data.type = 4
      data.msg = 'Unhealthy'
      data.rec = 'Slight irritations may occur. You should buy masks to avoid health issues.'
      data.ads = [{
      	'url': 'http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&ie=UTF8&qid=1485176735&sr=1-8&keywords=air+quality+monitor',
      	'title': 'Purifier',
      	'image_path': 'static/images/air_purifier.jpg'
      }, {
      	'url': 'http://www.amazon.in/Kent-Ozone-Room-Air-Purifier/dp/B009DA6ATS?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_1',
      	'title': 'Room Cleaner',
      	'image_path': 'static/images/room_cleaner.jpg'
      }, {
      	'url': 'http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2',
      	'title': 'Sensor',
      	'image_path': 'static/images/dust_sensor.jpg'
      }]
    } else if (aqi > 200 && aqi <= 300) {
      data.type = 5
      data.msg = 'Very Unhealthy'
      data.rec = 'Children should be kept indoor. People with breathing or heart problems will experience reduced endurance. Wear masks and increase the distance between you and the car in front while in traffic jams or stationary at traffic lights.'
      data.ads = [{
      	'url': 'http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&ie=UTF8&qid=1485176735&sr=1-8&keywords=air+quality+monitor',
      	'title': 'Purifier',
      	'image_path': 'static/images/air_purifier.jpg'
      }, {
      	'url': 'http://www.amazon.in/Honeywell-anti-pollution-foldable-face-mask/dp/B01AJI0QF6/ref=sr_1_4?ie=UTF8&qid=1485177485&sr=8-4&keywords=mask+air+pollution',
      	'title': 'Mask',
      	'image_path': 'static/images/mask.jpg'
      }, {
      	'url': 'http://www.amazon.in/Laser-Egg-Air-Quality-Monitor/dp/B01CD3ARPE/ref=sr_1_3?ie=UTF8&qid=1485184915&sr=8-3&keywords=air+quality',
      	'title': 'New Monitor',
      	'image_path': 'static/images/monitor.jpg'
      }]
    } else if (aqi > 300) {
      data.type = 6
      data.msg = 'Hazardous'
      data.rec = 'There may be strong irritations and symptoms and may trigger other illnesses. Stay indoor if not urgent or look for better route(s)'
      data.ads = [{
      	'url': 'http://www.amazon.in/Smiledrive-Multifunctional-Formaldehyde-HCHO-Indoor-Monitoring/dp/B01N78173X/ref=sr_1_8?ie=UTF8&qid=1485184418&sr=8-8&keywords=air+quality+monitor"',
      	'title': 'Pollution Detector',
      	'image_path': 'static/images/polution_detactor.jpg'
      }, {
      	'url': 'http://www.amazon.in/Kent-Ozone-Room-Air-Purifier/dp/B009DA6ATS?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_1',
      	'title': 'Room Cleaner',
      	'image_path': 'static/images/room_cleaner.jpg'
      }, {
      	'url': 'http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2',
      	'title': 'Sensor',
      	'image_path': 'static/images/dust_sensor.jpg'
      }]
    } else {
      data.type = 'na'
      data.msg = 'Not available!'
      data.rec = 'N/A'
      data.ads = [{
      	'url': 'http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&ie=UTF8&qid=1485176735&sr=1-8&keywords=air+quality+monitor',
      	'title': 'Purifier',
      	'image_path': 'static/images/air_purifier.jpg'
      }, {
      	'url': 'http://www.amazon.in/Honeywell-anti-pollution-foldable-face-mask/dp/B01AJI0QF6/ref=sr_1_4?ie=UTF8&qid=1485177485&sr=8-4&keywords=mask+air+pollution',
      	'title': 'Mask',
      	'image_path': 'static/images/mask.jpg'
      }, {
      	'url': 'http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2',
      	'title': 'Sensor',
      	'image_path': 'static/images/dust_sensor.jpg'
      }]
    }
    return data
  },

  expandCollapse: function() {
    var paneContainer = document.getElementById('pane-container');
    var rightPane = document.getElementById('right-pane');
    var rightPaneBtn = document.getElementById('right-pane-btn');
    var leftLimit = 10;
    var rightLimit = 90;

    rightPaneBtn.addEventListener('click', function() {
        paneContainer.classList.toggle('expanded');
        var pc = $(this)
        if(!$(paneContainer).hasClass('expanded')){
            pc.html('&larr;');
        }else{
            pc.html('&rarr;');
        };
    });
  },

  // navigation code
  autocompleteDirectionHandler: function() {
    var self = this;

    originPlaceId = null;
    destinationPlaceId = null;
    var originInput = document.getElementById('origin-input');
    var destinationInput = document.getElementById('destination-input');

    directionsService = new google.maps.DirectionsService;
    directionsDisplay = new google.maps.DirectionsRenderer;
    directionsDisplay.setMap(self.map);

    var originAutocomplete = new google.maps.places.Autocomplete(
      originInput, {
        placeIdOnly: true
      });

    var destinationAutocomplete = new google.maps.places.Autocomplete(
      destinationInput, {
        placeIdOnly: true
      });

    self.setupPlaceChangedListener(originAutocomplete, 'ORIG');
    self.setupPlaceChangedListener(destinationAutocomplete, 'DEST');
    //map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
    //map.controls[google.maps.ControlPosition.TOP_LEFT].push(destinationInput);
  },

  originPlace: null,
  destinationPlace: null,
  setupPlaceChangedListener: function(autocomplete, mode) {
    var self = this;
    autocomplete.bindTo('bounds', this.map);
    autocomplete.addListener('place_changed', function() {
      var place = autocomplete.getPlace();
      if (!place.place_id) {
        window.alert("Please select an option from the dropdown list.");
        return;
      }
      if (mode === 'ORIG') {
        self.originPlace = place;
      } else {
        self.destinationPlace = place;
      }
      self.route();
    });
  },

  // points distance from path.
  points_distance: 1 * 1.609344,
  routes_available: [], //contains routes objects.
  directions_available: [],
  start_end_points: [],

  route: function() {
    var self = this;

    if (!self.originPlace || !self.destinationPlace) {
      return;
    }
    var originPlaceId = self.originPlace.place_id;
    var destinationPlaceId = self.destinationPlace.place_id;

    // Clear any previous route boxes from the map
    this.clearBoxes();

    directionsService.route({
      origin: {
        'placeId': originPlaceId
      },
      destination: {
        'placeId': destinationPlaceId
      },
      travelMode: 'DRIVING',
      provideRouteAlternatives: true,
      avoidHighways: true,
      avoidTolls: true,
    }, function(response, status) {
      if (status === 'OK') {
        self.routes_available = response.routes;

        // draw routes on map
        for (var i = 0, len = response.routes.length; i < len; i++) {
          var path = null;
          if (i == 0) {
            path = new google.maps.Polyline({
                path : response.routes[i].overview_path,
                strokeColor : "#4285f4",
                zIndex:1100,
                strokeOpacity : 1,
                strokeWeight : 4,
                map:self.map
            })
            self.directions_available.push(path);

              google.maps.event.addListener(path, 'mouseover', function() {
                this.setOptions({strokeColor : "#3e50b4", zIndex:1200,})
              });
              google.maps.event.addListener(path, 'mouseout', function() {
                this.setOptions({strokeColor : "#4285f4", zIndex:1100,})
              });
          }
          else {
            path = new google.maps.Polyline({
                path : response.routes[i].overview_path,
                strokeColor : "grey",
                strokeOpacity : 0.8,
                zIndex:1000,
                strokeWeight : 4,
                map:self.map
            });

            self.directions_available.push(path);
               google.maps.event.addListener(path, 'mouseover', function() {
                this.setOptions({strokeColor : "#3e50b4", strokeOpacity:1, zIndex:1200,})
              });
              google.maps.event.addListener(path, 'mouseout', function() {
                this.setOptions({strokeColor : "grey", strokeOpacity : 0.8, zIndex:1000,})
              });
          }

          // scope resolution.
          var current_route = self.routes_available[i];
          google.maps.event.addListener(path, 'click', function(event) {
             console.log(current_route);
             if (!$('.sr_res.marker_hover').length) {
                  $('body').append(
                  	'<section class="sr_res marker_hover"><span class="close-icon"></span><ol></ol><ol></ol>' +
                  	'<div class="ads-container"><a class="ads-anchor" target="_blank" href="http://www.amazon.in/Philips-AC1215-20-Purifier-White/dp/B01L6MT7E0/ref=sr_1_8?s=kitchen&amp;ie=UTF8&amp;qid=1485176735&amp;sr=1-8&amp;keywords=air+quality+monitor">' +
									  '<div class="ads"><div>Purifier</div><div class="img-container">' +
									  '<img src="/static/images/air_purifier.jpg" class="small-img "></div></div></a>' +
                  	'<a class="ads-anchor center" target="_blank" href="http://www.amazon.in/Honeywell-anti-pollution-foldable-face-mask/dp/B01AJI0QF6/ref=sr_1_4?ie=UTF8&qid=1485177485&sr=8-4&keywords=mask+air+pollution">' +
									  '<div class="ads"><div>Mask</div><div class="img-container">' +
									  '<img src="/static/images/mask.jpg" class="small-img "></div></div></a>' +
                  	'<a class="ads-anchor" target="_blank" href="http://www.amazon.in/Adapter-Application-Monitoring-Filtering-Station/dp/B01CV8R86W?_encoding=UTF8&psc=1&refRID=CFZGM129AXD221Q19JXW&ref_=pd_ybh_a_2">' +
									  '<div class="ads"><div>Sensor</div><div class="img-container">' +
									  '<img src="/static/images/dust_sensor.jpg" class="small-img "></div></div></a></div>' +
                  	'</section>');
                }
                var mp = $('.sr_res.marker_hover');
                allOls = mp.find('ol');
                allOls[0].innerHTML = '<span class="distance-icon"></span><span class="label">Distance: </span><span>' + current_route['legs'][0]['distance']['text']  + '</span>';
                let avg_aqi = isNaN(current_route['average_aqi']) ? 'Not available' : current_route['average_aqi'];
                allOls[1].innerHTML = '<span class="air-icon"></span><span class="label">Average AQI: </span><span>' + avg_aqi + '</span>';


				var close = $('.close-icon');
				close.on('click', function() {
				  $('.sr_res.marker_hover').hide();
				});
                var box = $('.sr_res.marker_hover');

                box.css({
                  top: event.ua.clientY + 5,
                  left: event.ua.clientX + 5
                });
                box.fadeIn(300);
          });

        }

        // center and zoom the map
        self.set_center();

        // create starting and end markers
        while(self.start_end_points.length)
            self.start_end_points.pop().setMap(null);

        path = AQI.routes_available[0];
        self.start_end_points.push(new self.marker.CustomMarker(path.overview_path[0], {txt: "A", type:0}));
        self.start_end_points.push(new self.marker.CustomMarker(
            path.overview_path[path.overview_path.length - 1],
            {txt: "B", type:0}
        ))

      } else {
        window.alert('Directions request failed due to ' + status);
      }
    });

    // switch mode
    //self.switch_mode(false);
    self.points_mode = 1;
    // we need to reload the AQI data.
    new google.maps.event.trigger(self.map, 'bounds_changed' );
  },

  // Displays the box.
  boxpolys: [],
  best_route: null,
  find_best_route: function(){
    var self = this;
    var best_route_aqi = 10000; //some large no.
    // figure out the best route
    for(var r=0; r<self.routes_available.length; r++){
        var route = self.routes_available[r];
        var boxes = routeBoxer.box(route.overview_path, self.points_distance);

        // Starts drawing boxes.
        var total_aqi = 0, points_count = 0;
        for (var i = 0; i < boxes.length; i++) {
          self.boxpolys.push(new google.maps.Rectangle({
                bounds: boxes[i],
                fillOpacity: 0, // set this to 0 to hide the boxes.
                strokeOpacity: 0.1,
                strokeColor: '#000000',
                strokeWeight: 1,
                map: this.map
          }));
          for (var j = 0; j < this.marker.markers.length; j++) {
            if (boxes[i].contains(this.marker.markers[j].latlng_)){
                  var aqi = this.marker.markers[j].data.txt;
                  if(parseInt(aqi)){
                    total_aqi += aqi;
                    points_count++;
                  }
                $(this.marker.markers[j].div_).show();
              }
          }
        }

        // calculate the actual best route.
        route.average_aqi = parseInt(total_aqi/ points_count);
        if(best_route_aqi > route.average_aqi){
            self.best_route = r;
            best_route_aqi = route.average_aqi;
        }
        console.log(route, total_aqi/ points_count);
    }

    var b_r = self.directions_available[self.best_route];
    if(b_r){
         b_r.setOptions({strokeColor : "#096", zIndex:1120});
         google.maps.event.addListener(b_r, 'mouseover', function() {
            this.setOptions({strokeColor : "#3e50b4", strokeOpacity:1, zIndex:1200,})
         });
         google.maps.event.addListener(b_r, 'mouseout', function() {
            this.setOptions({strokeColor : "#096", strokeOpacity : 0.8, zIndex:1120,})
         });
    }

    self.addSpeech('The road in Green is most suitable, As per current air quality. Please click the path for more details');

    // init vehicle type.
    VT.init();

  },

  set_center:function(){
    var bounds = new google.maps.LatLngBounds();

    for(var i=0; i<AQI.routes_available.length; i++)
        for(var j=0; j<AQI.routes_available[i].overview_path.length; j++)
             bounds.extend(AQI.routes_available[i].overview_path[j]);

    AQI.map.fitBounds(bounds);
  },

  // Clear boxes currently on the map
  clearBoxes: function() {
      while (this.directions_available.length) {
        this.directions_available.pop().setMap(null);
      }

    while (this.boxpolys.length){
        this.boxpolys.pop().setMap(null);
     }
  },

  setLatLong: function(type, response) {
    latLongMap[type]['lat'] = response['results'][0]['geometry']['location']['lat'];
    latLongMap[type]['lng'] = response['results'][0]['geometry']['location']['lng'];
  },

  addSpeech: function(message) {
    const msg = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(msg);
  }

}
//
//  findPlaces: function(boxes, searchIndex) {
//    var request = {
//      bounds: boxes[searchIndex],
//      types: ["gas_station"]
//    };
//    service.radarSearch(request, function(results, status) {
//      if (status != google.maps.places.PlacesServiceStatus.OK) {
//        console.log("Request[" + searchIndex + "] failed: " + status);
//        return;
//      }
//      document.getElementById('side_bar').innerHTML += "bounds[" + searchIndex + "] returns " + results.length + " results<br>"
//      for (let i = 0, result; result = results[i]; i++) {
//        let marker = createMarker(result);
//      }
//      searchIndex++;
//      if (searchIndex < boxes.length)
//        findPlaces(boxes, searchIndex);
//    });
//  },


// Vehicle type module here
VT = {
    init:function(){
        var self = this;
        $('.vehicle_type').on('change', function(){
            self.vehicle_type = $('.vehicle_type').val();
        })

       if(!self.vehicle_type || self.vehicle_type!='sedan') return;
       for(var i=0; i<AQI.directions_available.length; i++){
         var path = AQI.directions_available[i];
         var data = this.check_data()
         this.suitable_path(data, path);
       }
    },

    vehicle_type: null,
    r_points:null,
    check_data:function(){
        if(this.r_points){
           return this.r_points;
        }

        var g_points = [];
        var points = [[28.677090000000003,76.89247],[28.6781,76.89068],[28.67847,76.89],[28.679040000000004,76.88906],[28.67941,76.88860000000001],[28.67986,76.88817],[28.68043,76.88774000000001],[28.680780000000002,76.88753000000001],[28.681990000000003,76.88690000000001],[28.68427,76.88572],[28.684240000000003,76.88559000000001],[28.684320000000003,76.88554],[28.68588,76.88476],[28.687350000000002,76.884],[28.68767,76.87870000000001],[28.687880000000003,76.87505],[28.68814,76.87157],[28.688440000000003,76.86788],[28.688850000000002,76.86346],[28.689180000000004,76.86003000000001],[28.68934,76.85856000000001],[28.689420000000002,76.85832],[28.68963,76.85788000000001],[28.690320000000003,76.85644],[28.69074,76.85537000000001],[28.691240000000004,76.85436],[28.6917,76.8533],[28.692510000000002,76.85146],[28.69282,76.85039],[28.693910000000002,76.84619],[28.69602,76.83814000000001],[28.697580000000002,76.83208],[28.69975,76.82360000000001],[28.70127,76.81769000000001],[28.701320000000003,76.81749],[28.701310000000003,76.81728000000001],[28.700680000000002,76.81505],[28.699460000000002,76.81063],[28.696980000000003,76.80166000000001],[28.695850000000004,76.79768],[28.69421,76.79162000000001],[28.693260000000002,76.78809000000001],[28.692660000000004,76.78585000000001],[28.69226,76.78450000000001],[28.69178,76.78286],[28.69168,76.78234],[28.691710000000004,76.78207],[28.69188,76.78176],[28.69208,76.78153],[28.692370000000004,76.78124000000001],[28.692580000000003,76.78107],[28.692700000000002,76.78089],[28.692940000000004,76.78041],[28.69311,76.77978],[28.693120000000004,76.77919],[28.693070000000002,76.77889],[28.692960000000003,76.77865000000001],[28.692480000000003,76.77802000000001],[28.692460000000004,76.77789],[28.692480000000003,76.77755],[28.69255,76.77714],[28.692610000000002,76.77653000000001],[28.69264,76.77405],[28.6929,76.76417000000001],[28.693,76.75986],[28.693540000000002,76.74353],[28.693830000000002,76.73733],[28.693900000000003,76.73273],[28.693920000000002,76.73047000000001],[28.693990000000003,76.72955],[28.69412,76.729],[28.694450000000003,76.72821],[28.694720000000004,76.72766],[28.695090000000004,76.72677],[28.695890000000002,76.72485],[28.696350000000002,76.72357000000001],[28.69715,76.72120000000001],[28.69742,76.72040000000001],[28.69761,76.72006],[28.697830000000003,76.71981000000001],[28.69808,76.71964000000001],[28.698490000000003,76.71936000000001],[28.698660000000004,76.71921],[28.69883,76.71892000000001],[28.69902,76.71823],[28.69911,76.71777],[28.69911,76.71755],[28.69902,76.71736],[28.69865,76.71696],[28.69837,76.7166],[28.698210000000003,76.71632000000001],[28.697830000000003,76.71544],[28.69751,76.71471000000001]]
        for(var i=0; i<points.length; i++){
            g_points.push(new google.maps.LatLng(points[i][0], points[i][1]))
        }
        this.r_points = g_points;
        return g_points;
    },

    draw:function(point){
          var circle = new google.maps.Circle({
            strokeColor: '#ea4335',
            strokeOpacity: 0.5,
            strokeWeight: 8,
            fillColor: '#ea4335',
            fillOpacity: 0.5,
            map: AQI.map,
            center: point,
            radius: 1,
            zIndex:1500
          });
//        var path = new google.maps.Polyline({
//            path : gpoints,
//            strokeColor : "red",
//            zIndex:1400,
//            strokeOpacity : 1,
//            strokeWeight : 4,
//            map:AQI.map
//        })
//        self.directions_available.push(path);

//          google.maps.event.addListener(path, 'mouseover', function() {
//            this.setOptions({strokeColor : "#3e50b4", zIndex:1200,})
//          });
//          google.maps.event.addListener(path, 'mouseout', function() {
//            this.setOptions({strokeColor : "#4285f4", zIndex:1100,})
//          });
    },

    suitable_path: function(data, path){
       for(var i=0; i<data.length; i++){
            var point = data[i];

            // if point lies on the path draw over it.
            if(google.maps.geometry.poly.containsLocation(point, path)){
                this.draw(point);
            }
       }
    }

}

