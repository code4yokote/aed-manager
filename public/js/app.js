// Backbone.emulateHTTP = true
jQuery.support.cors = true

var apiBase = "https://api.cloud.appcelerator.com/v1/"
	, appKey = "JMWcUyfIFGRT3K7oBpkjzLdP98KMvCJq"
	, _sync = Backbone.sync

/**
 * @namespace Appネームスペース
 */
, InfoMap = {
	/**
	 * マップのID
	 */
	id: __infoMapId//viewで定義される変数
	/**
	 * 選択中のポイント(InfoMap.model.Point) 
	 */
	, _selectedPoint: null
}

/**
 * @namespace ユーティリティメソッド
 */
InfoMap.util = {
	/**
	 * collectionのcomparatorに使用する
	 * 日付昇順にソート
	 * @param {Date} p1
	 * @param {Date} p2
	 * @returns {Number} -1 or 1 
	 */
	comparatorDateAsc: function(p1, p2) {
		return p1.get("created_at") < p2.get("created_at") ? -1 : 1;
	}
	/**
	 * collectionのcomparatorに使用する
	 * 日付降順にソート
	 * @param {Date} p1
	 * @param {Date} p2
	 * @returns {Number} -1 or 1 
	 */
	, comparatorDateDesc: function(p1, p2) {
		return p1.get("created_at") > p2.get("created_at") ? -1 : 1;
	}
	/**
	 * ウィンドウに収まるように各要素の大きさを調整する
	 */
	, fitWindow: function(){
		$("#content").height($("body").height()-$("#header").outerHeight())
		InfoMap.elements.list.height($("#content").height()-InfoMap.elements.filter.outerHeight()-InfoMap.elements.sort.outerHeight())
	}
	/**
	 * コントロール要素を使用不能にする
	 */
	, disableControls: function(){
		//InfoMap.controls.addClass("ui-disabled")
		InfoMap.elements.list.find(">li").addClass("ui-disabled")
		InfoMap.elements.filterControl.attr("disabled", "disabled").addClass("ui-disabled").selectmenu("refresh")
		InfoMap.elements.sortControl.attr("disabled", "disabled").addClass("ui-disabled").selectmenu("refresh")
	}
	/**
	 * コントロール要素を使用可能にする
	 */
	, enableControls: function(){
		// InfoMap.controls.removeClass("ui-disabled")
		InfoMap.elements.list.find(">li").removeClass("ui-disabled")
		InfoMap.elements.filterControl.removeAttr("disabled").removeClass("ui-disabled").selectmenu("refresh")
		InfoMap.elements.sortControl.removeAttr("disabled").removeClass("ui-disabled").selectmenu("refresh")
	}
	, apiUrl: function(api) {
		return "/api/" + api
	}
}

/**
 * @namespace モデルクラス 
 */
InfoMap.model =	{
	Point: Backbone.Model.extend(/** @lends InfoMap.model.Point */{
		/**
		 * マップ上のポイントのデータ
		 * @constructs
		 * @class InfoMap.model.Point
		 * @extends Backbone.Model
		 * @requires backbone.js
		 */
		initialize: function(){
			var latlng = new google.maps.LatLng(this.get('custom_fields').coordinates[0][1], this.get('custom_fields').coordinates[0][0])
			
			/*
			 * リスト項目のビュー生成
			 */
			new InfoMap.view.PointList({model:this})
			
			/*
			 * マーカー設定
			 */
			this.marker = new StyledMarker({
				position: latlng
				, map: InfoMap.gmap.map
				, title: this.get('subject')
				, styleIcon: new StyledIcon(StyledIconTypes.MARKER, InfoMap.config.markerStyles.deselected)
			})
			google.maps.event.addListener(this.marker,"click",_.bind(function(){
				this.trigger('select')
			}, this))
			// google.maps.event.addListener(this.marker,"mouseover",function(){
				// this.setZIndex(6666)
			// })
			// google.maps.event.addListener(this.marker,"mouseout",function(){
				// this.setZIndex(null)
			// })
			
			/*
			 * オーバーレイ（情報ウィンドウ）設定
			 */
			new InfoMap.view.InfoWindowContent({model:this})
			// this.overlay = new google.maps.InfoWindow({
			// 	position: latlng
			// 	, pixelOffset: new google.maps.Size(0,-37)
			// 	, content: (new InfoMap.view.InfoWindowContent({model:this})).el
			// })
			// google.maps.event.addListener(this.overlay,"closeclick",_.bind(function(){
			// 	this.trigger('deselect')
			// }, this))
			
			/*
			 * Polyline設定
			 */
			this.polyline = new google.maps.Polyline({
				path: [latlng, new google.maps.LatLng(this.get("place").latitude, this.get("place").longitude)],
				visible: false,
				strokeColor: "#C00",
				strokeOpacity: 0.6,
				strokeWidth: 4,
				icons: [
					{
						icon: {
							path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
							fillColor: "#C00",
							fillOpacity: 0.6,
							strokeOpacity: 0,
							scale: 6
						},
						offset: "0%"
					},
					{
						icon: {
							path: google.maps.SymbolPath.CIRCLE,
							fillColor: "#C00",
							fillOpacity: 0.6,
							strokeOpacity: 0,
							scale: 4
						}
					}
				],
				map: InfoMap.gmap.map
			})
			
			/*
			 * 変更時の処理
			 */
			this.on('change:custom_fields', function(){
				var prevCf = this.previousAttributes().custom_fields
				, changedCf = this.changed.custom_fields

				if(prevCf.status != changedCf.status ){
					this.trigger("statusChange", changedCf.status, prevCf.status)
				}
			})
			/*
			 * 削除時の処理
			 */
			this.on('destroy', function(){
				this.trigger('deselect')
				this.off()
				this.collection.remove(this).trigger('reset')
			}),
			/**
			 * リスト・マーカーで選択された時の処理
			 */
			this.on('select', function(){
				console.log("select")
				if(InfoMap._selectedPoint && this.id === InfoMap._selectedPoint.id) return//選択済みなら何もしない
				this.marker.setZIndex(google.maps.Marker.MAX_ZINDEX - 1)
				this.marker.styleIcon.set("color", InfoMap.config.markerStyles.selected.color)
				this.marker.styleIcon.set("fore", InfoMap.config.markerStyles.selected.fore)
				// this.overlay.open(InfoMap.gmap.map)
				this.polyline.setVisible(true)
				InfoMap.gmap.map.setCenter(this.marker.getPosition())
				
				if(InfoMap._selectedPoint) {
					InfoMap._selectedPoint.trigger('deselect', _.bind(function(){
						InfoMap._selectedPoint = this
					}, this))
				} else {
					InfoMap._selectedPoint = this
				}
			})
			/*
			 * 選択解除された時の処理
			 */
			this.on('deselect', function(callback){
				this.marker.setZIndex(null)
				this.marker.styleIcon.set("color", InfoMap.config.markerStyles.deselected.color)
				this.marker.styleIcon.set("fore", InfoMap.config.markerStyles.deselected.fore)
				// this.overlay.close()
				this.polyline.setVisible(false)
				InfoMap._selectedPoint = null
				if(callback && _.isFunction(callback)) callback()
			})
			/*
			 * 位置情報更新処理
			 */
			this.on('updateLocation', function(){
				var latlng = this.marker.getPosition(),
					api = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + latlng.lat() + "," + latlng.lng() + "&sensor=false"
				$.mobile.loading('show', {theme: 'b', textVisible: true, text: "保存中..."})
				this.save({
					lat: latlng.lat(),
					lng: latlng.lng()
				},{
					wait: true
					, success: function(mdl, atts) {
						mdl.trigger('disableLocationEditMode', {lat: atts.lat, lng: atts.lng})
						$.mobile.loading('hide')
					}
					, error: function(mdl, xhr) {
						if(xhr.status == 401) {
							$("#alert-unauthorized").popup('open')
						}
						console.log(xhr)
						mdl.trigger('disableLocationEditMode')
						$.mobile.loading('hide')
					}
				})
			})
			/*
			 * 位置情報更新モードを有効にする
			 */
			this.on('enableLocationEditMode', function(){
				if(this != InfoMap._selectedPoint) return false
				// this.overlay.close()
				_.each(InfoMap.gmap.store.marker, _.bind(function(m){
					if(m != this.marker) {
						m.setVisible(false)
					}
				}, this))//他のマーカーを非表示にする
				InfoMap.util.disableControls()
				if(InfoMap.gmap.map.getZoom() < 18) InfoMap.gmap.map.setZoom(18)
				InfoMap.gmap.map.panTo(this.marker.getPosition())
				this.marker.setDraggable(true)
				$("#location-edit-control").show()
			})
			/*
			 * 位置情報更新モードを無効にする
			 */
			this.on('disableLocationEditMode', function(update){
				var latlng = update ?
					new google.maps.LatLng(update.lat, update.lng) :
					new google.maps.LatLng(this.get('lat'), this.get('lng'))
				this.marker.setPosition(latlng)
				this.marker.setDraggable(false)
				// this.overlay.setPosition(latlng)
				this.collection.trigger('reset')
				InfoMap.util.enableControls()
				$("#location-edit-control").hide()
			})
		}
		, url: function(){
			return this.collection.url
		}
	})

	, City: Backbone.Model.extend(/** @lends InfoMap.model.City */{
		/**
		 * ステータスのデータ
		 * @constructs
		 * @class InfoMap.model.City
		 * @extends Backbone.Model
		 * @requires backbone.js
		 */
		initialize: function(){
			/*
			 * view(option要素)を生成
			 */
			new InfoMap.view.CityFilter({model:this})
		}
		/**
		 * モデルのIDとして使用するキー 
		 */
		, idAttribute: "id"
	})
},

/**
 * @namespace コレクションクラス
 */
InfoMap.collection = {
	Point: Backbone.Collection.extend(/** @lends InfoMap.collection.Point */{
		/**
		 * 
		 * @constructs
		 * @class InfoMap.collection.Point
		 * @extends Backbone.Collection
		 * @requires backbone.js
		 */
		initialize: function(){
			/*
			 * ポイントのリストが
			 */
			this.on('reset', function(){
				var visibleCount = 1,
					mcMarkers = [],
					selected = InfoMap._selectedPoint ? InfoMap._selectedPoint.id : null
				InfoMap.elements.list.empty()
				InfoMap.gmap.mc.clearMarkers()
				_.each(InfoMap.gmap.store.marker, function(m) {
					m.setMap(null)
				})
				// _.each(InfoMap.gmap.store.overlay, function(m) {
				// 	m.setMap(null)
				// })
				InfoMap.gmap.store.marker.length = 0
				// InfoMap.gmap.store.overlay.length = 0
				if(selected) InfoMap._selectedPoint.trigger('deselect')
				this.each(function(mdl){
					// var statusModel = InfoMap.data.status.get(mdl.get("status"))
					mdl.trigger('addlist', visibleCount)
					mdl.marker.styleIcon.set("text", visibleCount + "")
					mdl.marker.setVisible(true)
					mcMarkers.push(mdl.marker)
					InfoMap.gmap.store.marker.push(mdl.marker)
					// InfoMap.gmap.store.overlay.push(mdl.overlay)
					if(selected == mdl.id) mdl.trigger('select')
					visibleCount++
				})
				InfoMap.gmap.mc.addMarkers(mcMarkers)
				InfoMap.elements.list.listview('refresh')
			})
			this.on('remove', function(){
				//console.log("remove:")
			})
		}
		/**
		 * モデルクラス
		 * @default InfoMap.model.Point
		 */
		, model: InfoMap.model.Point
		/**
		 * APIのURL 
		 */
		, url: InfoMap.util.apiUrl("event")
		/**
		 * ソート用関数
		 */
		, comparator: InfoMap.util.comparatorDateDesc
		/**
		 * parse
		 */
		, parse: function(res){
			return res.events
		}
		/**
		 * Cityでフィルターを行う
		 * @param {String} City ステータスID
		 */
		, filterByCity: function(city) {
			//if(city == this._currentFilter) return false
			var fetchOptions = {
				data: {
					limit: 1000,
					order: "created_at"
				},
				cache: false,
				reset: true,
				success: function(col, res, opt) {
					InfoMap.gmap.map.setCenter(col.at(0).marker.getPosition())
				}
			}
			, where = {
				status: { "$ne": 4 }
			}

			if(InfoMap._selectedPoint)
				InfoMap._selectedPoint.trigger('deselect')

			if(city && city !== "null")
				where["[CUSTOM_Cities]city_id"] = InfoMap.focused

			fetchOptions.data.where = JSON.stringify(where)

			this.fetch(fetchOptions)
			// this.each(function(mdl){
				// if(City == 0 || mdl.get("status") == status) {
					// mdl._filtered = false
				// } else {
					// mdl._filtered = true
				// }
			// })
			// this._currentFilter = status
			// if(InfoMap._selectedPoint && InfoMap._selectedPoint._filtered) InfoMap._selectedPoint.trigger('deselect')
			//this.trigger('reset')
		}
	})
	
	, City: Backbone.Collection.extend(/** @lends InfoMap.collection.City */{
		/**
		 * ステータスのコレクション
		 * @constructs
		 * @class InfoMap.collection.City
		 * @extends Backbone.Collection
		 * @requires backbone.js
		 */
		initialize: function(){}
		/**
		 * モデルクラス 
		 */
		, model: InfoMap.model.City
		/**
		 * APIのURL 
		 */
		, url: InfoMap.util.apiUrl("city")
		/**
		 * parse
		 */
		, parse: function(res){
			return res.Cities
		}
	})
}

/**
 * @namespace ビュークラス 
 */
InfoMap.view = {
	PointList: Backbone.View.extend(/** @lends InfoMap.view.PointList */{
		/**
		 * ポイントリストの項目を生成（li要素）
		 * @constructs
		 * @class InfoMap.view.PointList
		 * @extends Backbone.View
		 * @requires backbone.js
		 */
		initialize: function(){
			this.listenTo(this.model, 'change', this.update)
			this.listenTo(this.model, 'statusChange', this.updateStatus)
			this.listenTo(this.model, 'destroy', this.destroy)
			this.listenTo(this.model, 'select', this.select)
			this.listenTo(this.model, 'deselect', this.deselect)
			this.listenTo(this.model, 'addlist', this.push)
			this.render()
		}
		, tagName: 'li'
		, className: function(){
			return "status-" + this.model.get("custom_fields").status
		}
		, events: {
			"click": function(){
				this.model.trigger('select')
			}
		}
		, template: _.template($("#point-list-item").html())//text()だとIEで動かない
		/**
		 * レンダリング処理 
		 */
		, render: function(){
			this.$el.html(this.template(this.model.toJSON())).enhanceWithin()
			return this
		}
		/*
		 * 内容の書き換え
		 */
		, update: function(){
			var index = this.$(".list-index").text()
			this.$el.html(this.template(this.model.toJSON()))
			this.$(".list-index").text(index)
			InfoMap.elements.list.listview("refresh")
			return this
		}
		, updateStatus: function(changed, prev){
			this.$el.removeClass("status-" + prev).addClass("status-" + changed)
		}
		/*
		 * モデル削除時の処理
		 */
		, destroy: function(){
			this.undelegateEvents()
			this.$el.remove()
			delete this.model
		}
		/*
		 * 自身をリストビューに追加する
		 */
		, push: function(number){
			this.delegateEvents(this.events)
			InfoMap.elements.list.append(this.$el)
			this.$(".list-index").text(number)
			return this
		}
		/*
		 * 選択時のビューに対する処理
		 */
		, select: function(){
			this.$(".point-list-link").addClass("ui-btn-active")
			// this.$(".admin-menu").slideDown()
			this.catchMe()
		}
		/*
		 * 選択解除時のビューに対する処理
		 */
		, deselect: function(){
			this.$(".point-list-link").removeClass("ui-btn-active")
			// this.$(".admin-menu").slideUp()
		}
		/*
		 * 自身が表示されるようにリストをスクロールする。
		 * スクロール不要の場合は何もしない。
		 */
		, catchMe: function() {
			var position = this.$el.offset().top - InfoMap.elements.list.offset().top,
				scrollTo = InfoMap.elements.list.scrollTop() + position
			if(position > 0 && position < InfoMap.elements.list.height()) return
			InfoMap.elements.list.animate({
				scrollTop: scrollTo
			}, "fast")
		}
	})
	
	, InfoWindowContent: Backbone.View.extend(/** @lends InfoMap.view.InfoWindowContent */ {
		/**
		 * マップのInfoWindowの中身
		 * @constructs
		 * @class InfoMap.view.InfoWindowContent
		 * @extends Backbone.View
		 * @requires backbone.js
		 */
		initialize: function(){
			this.listenTo(this.model, 'change', this.rerender)
			this.listenTo(this.model, 'select', this.open)
			this.listenTo(this.model, 'deselect', this.close)
			this.listenTo(this.model, 'statusChange', this.updateStatus)
			this.render()
		}
		/**
		 * <public> DOMイベント
		 */
		, events: {
			"click .edit-button": "openForm"
			, "click .delete-button": "deletionConfirm"
			, "click .location-edit": "enableLocationEditMode"
			, "change .status-radio": "sendStatus"
			// , "panelclose": function(){ this.undelegateEvents() }
		}
		/**
		 * このviewのエレメントのタグ
		 */
		, tag: "div"
		/**
		 * クラス
		 */
		, className: function(){
			return 'info-panel status-' + this.model.get("custom_fields").status
		}
		/**
		 * テンプレート 
		 */
		, template: _.template($("#info-panel-content").html())
		/**
		 * レンダリング処理 
		 */
		, render: function(){
			this.$el.html(this.template(this.model.toJSON())).panel({
				display: "overlay"
				, dismissible: false
			}).appendTo("#map-page").enhanceWithin()
			return this//.delegateEvents(this.events)
		}
		, rerender: function(){
			this.$(".ui-panel-inner").html(this.template(this.model.toJSON())).enhanceWithin()
			return this
		}
		/**
		 * フォーム
		 */
		, open: function(){
			this.$el.panel("open")
		}
		, close: function(){
			// this.undelegateEvents()
			this.$el.panel("close")
		}
		, enableLocationEditMode: function(){
			this.model.trigger('enableLocationEditMode')
		}
		/*
		 * 削除確認ダイアログを開く
		 * オープン時イベントハンドラを登録し、クローズ時に解除する
		 */
		, deletionConfirm: function(){
			var self = this
			$("#deletion-confirm")
			.find("button").on('click', function(){
				$("#deletion-confirm").popup('close')
			}).end()
			.find(".delete-submit").on('click', function(){
				self._statusAjax(4)
				.done(function(res){
					self.model.trigger("destroy")
					$.mobile.loading('hide')
				})
			}).end()
			.on('popupafterclose', function(){
				$(this).off().find("button").off()
			})
			.popup('open')
		}
		, sendStatus: function(){
			var val = this.$(".status-radio:checked").val().replace("-" + this.id, "")
			, self = this

			this._statusAjax(val)
			.done(function(){
				var customFields = _.clone(self.model.get("custom_fields"))
				customFields.status = val
				self.model.set("custom_fields", customFields)
				$.mobile.loading('hide')
			})
		}
		, updateStatus: function(changed, prev){
			this.$el.removeClass("status-" + prev).addClass("status-" + changed)
		}
		, _statusAjax: function(val){
			return $.ajax({
				url: InfoMap.util.apiUrl("event")
				, type: "put"
				, data: {
					event_id: this.model.id
					, custom_fields: JSON.stringify({
						status: val
					})
				}
				, beforeSend: function(){
					$.mobile.loading('show')
				}
				, xhrFields: {
					withCredentials: true
				}
			})
		}
	})
	/*
	 * 編集フォーム
	 */
	// , ResponseForm: Backbone.View.extend({
	// 	initialize: function(){
	// 		this.render()
	// 	}
	// 	, events: {
	// 		"click .cancel-button": function(){
	// 			this.$el.popup("close")
	// 		}
	// 		, "click .submit-button": function(){
	// 			var serialized = this.$("form").serializeArray(),
	// 				data = {}
	// 			_.each(serialized, function(obj){
	// 				data[obj.name] = obj.value
	// 			})
	// 			this.model.save(data, {
	// 				wait: true,
	// 				success: function(mdl, res, opt) {
	// 					InfoMap.elements.filterControl.val(data.status).selectmenu("refresh").trigger("change")
	// 				},
	// 				error: function(mdl, xhr, opt) {
	// 					if(xhr.status == 401) {
	// 						$("#alert-unauthorized").popup('open')
	// 					}
	// 				}
	// 			})
	// 			this.$el.popup("close")
	// 		}
	// 		//ポップアップを閉じたらlistenしないように
	// 		, "popupafterclose": function(){
	// 			this.undelegateEvents()
	// 		}
	// 	}
	// 	, el: $("#response-form")
	// 	, template: _.template($("#response-form-inner").html())
	// 	, render: function(){
	// 		this.$el.html(this.template(this.model.toJSON())).enhanceWithin()
	// 	}
	// })
	/*
	 * ステータス選択フィールドの項目
	 */
	, CityFilter: Backbone.View.extend({
		initialize: function(){
			this.$el.html(this.model.get('name')).appendTo(InfoMap.elements.filterControl)
		}
		, tagName: 'option'
		, attributes: function(){
			var atts = {value: this.model.get('id')}
			return atts
		}
	})
}

// Backbone.sync = function(method, model, options) {
// 	console.log(model, options)
// 	if(method == "read")
// 		return _sync(method, model, options)

// 	if(method == "update") {
// 		var data = {}
// 		, excludes = ["updated_at", "created_at"]
// 		, saveAtts = {
// 			id: "event_id"
// 			, acls: "acl_id"
// 			, place: "place_id"
// 			, user: "user_id"
// 		}
// 		_(model.attributes).each(function(val, key){
// 			key = saveAtts[key] || key
// 			if(_.isObject(val)) {
// 				data[key] = val.id || JSON.stringify(val)
// 			} else if(_.indexOf(excludes, key) == -1 ) {
// 				data[key] = val
// 			}
// 		})
// 		options.data = data
// 		options.xhrFields = {
// 			withCredentials: true
// 		}
// 		return $.ajax()
// 	}
// }


/**
 * アプリ初期化 
 */
var initialize = function(config) {
	InfoMap.config = config
	InfoMap.focused = $.cookie("aedra_hq_city")
	$("#header-title").html(InfoMap.config.name)
	document.title = InfoMap.config.name

	InfoMap.elements = {
		list: $("#data-list")
		, filter: $("#data-filter")
		, filterControl: $("#filter-selector")
		, sort: $("#data-sorter")
		, sortControl: $("#sort-selector")
		, loginWindow: $("#login-form")
		// , loginButton: $('<a id="login-button" class="ui-btn ui-btn-right ui-icon-lock ui-btn-icon-left">ログイン</a>')
		// , logoutButton: $('<a id="logout-button" class="ui-btn ui-btn-right ui-icon-minus ui-btn-icon-left">ログアウト</a>')
	}
	InfoMap.util.fitWindow()
	/*
	 * Google Map
	 */
	InfoMap.gmap = {
		map: new google.maps.Map(document.getElementById("map-canvas"), {
			zoom: InfoMap.config.initialZoom
			, center: new google.maps.LatLng(InfoMap.config.initialLat, InfoMap.config.initialLng)
			, mapTypeId: google.maps.MapTypeId.ROADMAP
			, styles: InfoMap.config.mapStyles
		})
		, mc: new MarkerClusterer(null, [], {
			imagePath: InfoMap.config.markerDir,
			maxZoom: 15
		})
		, store: {
			marker: [],
			overlay: []
		}
	}
	InfoMap.gmap.mc.setMap(InfoMap.gmap.map)
	
	/*
	 * Data Object (Instance of collection)
	 */
	InfoMap.data  = {
		point: new InfoMap.collection.Point()
		, city: new InfoMap.collection.City()
	}
	
	/*
	 * DOM Event Handlers
	 */
	InfoMap.elements.sortControl.on('change', function(event, ui){
		if($(this).val() == 'ASC') {
			InfoMap.data.point.comparator = InfoMap.util.comparatorDateAsc
			InfoMap.data.point.sort()
		} else if($(this).val() == 'DESC') {
			InfoMap.data.point.comparator = InfoMap.util.comparatorDateDesc
			InfoMap.data.point.sort()
		}
	})
	InfoMap.elements.filterControl.on('change', function(){
		InfoMap.focused = $(this).val()
		$.cookie("aedra_hq_city", InfoMap.focused, {expires: 365})
		InfoMap.data.point.filterByCity(InfoMap.focused)
	})
	var logoutHandler = function(){
		$.ajax({
			url: InfoMap.util.apiUrl("users/logout")
			, xhrFields: {
				withCredentials: true
			}
		})
		.done(function(){
			InfoMap._isLoggedIn = false
			InfoMap.elements.logoutButton.remove()
			$("#header").append(InfoMap.elements.loginButton.on("click", loginHandler))
		})
	}
	var loginHandler = function(){
		InfoMap.elements.loginWindow.popup('open')
	}
	$("#le-ok").on('click', function(){
		InfoMap._selectedPoint.trigger('updateLocation')
	})
	$("#le-cancel").on('click', function(){
		InfoMap._selectedPoint.trigger('disableLocationEditMode')
	})
	$("#login-form form").on("submit", function(){
		var serialized = $(this).serializeArray(), data = {}
		_.each(serialized, function(obj){
			data[obj.name] = obj.value
		})
		$.ajax({
			url: InfoMap.util.apiUrl("users/login")
			, data: data
			, type: "post"
			, xhrFields: {
				withCredentials: true
			}
		})
		.done(function(res, status, xhr){
			console.log(xhr.getAllResponseHeaders())
			InfoMap.elements.loginWindow.popup('close')
			// InfoMap.elements.loginButton.remove()
			// $("#header").append(InfoMap.elements.logoutButton.on("click", logoutHandler))
		})
		return false
	})

	// $.ajax({
	// 	url: InfoMap.util.apiUrl("users/show/me")
	// 	// , data: {
	// 	// 	id: "52afa5beb73cbf0b2b01135d"
	// 	// 	, user_id: "52ff18cd465c0d08c306dc68"
	// 	// }
	// 	, xhrFields: {
	// 		withCredentials: true
	// 	}
	// })
	// .done(function(res){
	// 	InfoMap._isLoggedIn = true
	// 	$("#header").append(InfoMap.elements.logoutButton.on("click", logoutHandler))
	// })
	// .fail(function(res){
	// 	InfoMap._isLoggedIn = false
	// 	$("#header").append(InfoMap.elements.loginButton.on("click", loginHandler))
	// })
	
	/*
	 * ステータス選択フィールドの初期化
	 */
	InfoMap.data.city.fetch({
		data: {
			limit: 1000 
		}
		, success: function(col, res, opt) {
			InfoMap.elements.filterControl.val(InfoMap.focused).selectmenu('refresh')
			InfoMap.data.point.filterByCity(InfoMap.focused)
		}
	})
}

$(window).on('resize', InfoMap.util.fitWindow)

/*
 * Launch App
 */
$(document).on("pageinit", "#map-page", function(){
	/*
	 * load config
	 */
	if(InfoMap && InfoMap.id) {
		initialize({
			"name": "AED応援要請の一覧"
			, "baseUrl": "/"
			, "imgDir": "/images"
			, "markerDir": "/marker-images/"
			, "initialLat": 0
			, "initialLng": 0
			, "initialZoom": 17
			, "defaultFilter": null
			, "markerStyles": {
				selected: {
					color: "#ADDE63"
					, fore: "#333333"
				}
				, deselected: {
					color: "#CCCCCC"
					, fore: "#666666"
				}
			}
			, "mapStyles": [
				{
					"featureType": "road",
					"elementType": "geometry",
					"stylers": [{ "visibility": "simplified" }]
				},{
					"featureType": "landscape",
					"elementType": "labels",
					"stylers": [{ "visibility": "off" }]
				},{
					"featureType": "poi",
					"elementType": "labels.icon",
					"stylers": [{ "visibility": "off" }]
				},{
					"featureType": "road",
					"elementType": "labels",
					"stylers": [{ "visibility": "off" }]
				},{
					"featureType": "transit.line",
					"elementType": "labels",
					"stylers": [{ "visibility": "off" }]
				},{
					"featureType": "landscape",
					"elementType": "geometry",
					"stylers": [{ "color": "#f3f6e8" }]
				},{
					"featureType": "poi",
					"elementType": "geometry",
					"stylers": [{ "hue": "#ddff00" },{ "saturation": 1 }]
				},{
					"featureType": "poi",
					"elementType": "labels.text.fill",
					"stylers": [{ "color": "#8e9880" }]
				},{
					"featureType": "road.highway",
					"elementType": "geometry.fill",
					"stylers": [{ "color": "#ffd07d" }]
				},{
					"featureType": "water",
					"elementType": "geometry",
					"stylers": [{ "saturation": -54 },{ "hue": "#00fff7" }]
				},{
					"featureType": "road.local",
					"elementType": "geometry.fill",
					"stylers": [{ "color": "#ffffff" }]
				}
			]
		})
	}
})
