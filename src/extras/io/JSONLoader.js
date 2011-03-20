/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */

THREE.JSONLoader = function ( showStatus ) {

	THREE.Loader.call( this );

	this.showStatus = showStatus;	
	this.statusDomElement = showStatus ? this.addStatusElement() : null;
	
};

THREE.JSONLoader.prototype = new THREE.Loader();
THREE.JSONLoader.prototype.constructor = THREE.JSONLoader;
THREE.JSONLoader.prototype.supr = THREE.Loader.prototype;


THREE.JSONLoader.prototype = {

	addStatusElement: function ( ) {
		
		var e = document.createElement( "div" );
		
		e.style.fontSize = "0.8em"; 
		e.style.textAlign = "left";
		e.style.background = "#b00"; 
		e.style.color = "#fff"; 
		e.style.width = "140px"; 
		e.style.padding = "0.25em 0.25em 0.25em 0.5em"; 
		e.style.position = "absolute"; 
		e.style.right = "0px"; 
		e.style.top = "0px"; 
		e.style.zIndex = 1000;
		
		e.innerHTML = "Loading ...";
		
		return e;
		
	},
	
	updateProgress: function ( progress ) {

		var message = "Loaded ";

		if ( progress.total ) {

			message += ( 100 * progress.loaded / progress.total ).toFixed(0) + "%";


		} else {

			message += ( progress.loaded / 1000 ).toFixed(2) + " KB";

		}

		this.statusDomElement.innerHTML = message;

	},
	

	// Load models generated by slim OBJ converter with ASCII option (converter_obj_three_slim.py -t ascii)
	//  - parameters
	//		- model (required)
	//		- callback (required)
	//		- texture_path (optional: if not specified, textures will be assumed to be in the same folder as JS model file)

	load: function ( parameters ) {

		var url = parameters.model,
			callback = parameters.callback, 
		    texture_path = parameters.texture_path ? parameters.texture_path : THREE.JSONLoader.prototype.extractUrlbase( url ),
		
			s = (new Date).getTime(),
			worker = new Worker( url );
		
		worker.onmessage = function( event ) {
			
			THREE.JSONLoader.prototype.createModel( event.data, callback, texture_path );

		};

		worker.postMessage( s );

	},
	
	createModel: function ( json, callback, texture_path ) {

		var Model = function ( texture_path ) {

			var scope = this;

			THREE.Geometry.call( this );

			THREE.JSONLoader.prototype.init_materials( scope, json.materials, texture_path );

			parse();
			init_skin();

			this.computeCentroids();
			this.computeFaceNormals();
			
			function parse() {

				if ( json.version === undefined || json.version != 2 ) {

					console.error( 'Deprecated file format.' );
					return;

				}
	
				var i, j, 
				
				type, offset,

				isTriangle, 
				hasMaterial, 
				hasFaceUv, hasFaceVertexUv,
				hasFaceNormal, hasFaceVertexNormal,
				hasFaceColor, hasFaceVertexColor,

				vertex, face,
				
				faces = json.faces,
				vertices = json.vertices,
				normals = json.normals,

				nUvLayers = json.uvs.length;

				for ( i = 0; i < nUvLayers; i++ ) {

					scope.faceUvs[ i ] = [];
					scope.faceVertexUvs[ i ] = [];

				}

				offset = 0;

				while ( vertices[ offset ] ) {

					vertex = new THREE.Vertex();
					
					vertex.position.x = vertices[ offset ++ ];
					vertex.position.y = vertices[ offset ++ ];
					vertex.position.z = vertices[ offset ++ ];

					scope.vertices.push( vertex );

				}

				offset = 0;

				while ( faces[ offset ] ) {

					type = faces[ offset ];

					isTriangle          = isBitSet( type, 0 );
					hasMaterial         = isBitSet( type, 1 );
					hasFaceUv           = isBitSet( type, 2 );
					hasFaceVertexUv     = isBitSet( type, 3 );
					hasFaceNormal       = isBitSet( type, 4 );
					hasFaceVertexNormal = isBitSet( type, 5 );
					hasFaceColor	    = isBitSet( type, 6 );
					hasFaceVertexColor  = isBitSet( type, 7 );


					if ( isTriangle ) {

						face = new THREE.Face3();
					
						face.a = faces[ offset ++ ];
						face.b = faces[ offset ++ ];
						face.c = faces[ offset ++ ];

						nVertices = 3;

					} else {

						face = new THREE.Face4();
						
						face.a = faces[ offset ++ ];
						face.b = faces[ offset ++ ];
						face.c = faces[ offset ++ ];
						face.d = faces[ offset ++ ];

						nVertices = 4;

					}

					if ( hasMaterial ) {

						materialIndex = faces[ offset ++ ];
						face.materials = [ scope.materials[ materialIndex ] ];

					}

					if ( hasFaceUv ) {

						for ( i = 0; i < nUvLayers; i++ ) {

							uvLayer = json.uvs[ i ];

							uvIndex = faces[ offset ++ ];

							u = uvLayer[ uvIndex * 2 ];
							v = uvLayer[ uvIndex * 2 + 1 ];

							scope.faceUvs[ i ].push( new THREE.UV( u, v ) );

						}

					}

					if ( hasFaceVertexUv ) {

						for ( i = 0; i < nUvLayers; i++ ) {
							
							uvLayer = json.uvs[ i ];

							uvs = [];

							for ( j = 0; j < nVertices; j ++ ) {

								uvIndex = faces[ offset ++ ];

								u = uvLayer[ uvIndex * 2 ];
								v = uvLayer[ uvIndex * 2 + 1 ];

								uvs[ j ] = new THREE.UV( u, v );

							}

							scope.faceVertexUvs[ i ].push( uvs );

						}

					}

					if ( hasFaceNormal ) {

						normalIndex = faces[ offset ++ ] * 3;

						normal = new THREE.Vector3();
						
						normal.x = normals[ normalIndex ++ ];
						normal.y = normals[ normalIndex ++ ];
						normal.z = normals[ normalIndex ];

						face.normal = normal;

					}

					if ( hasFaceVertexNormal ) {

						for ( i = 0; i < nVertices; i++ ) {

							normalIndex = faces[ offset ++ ] * 3;

							normal = new THREE.Vector3();
							
							normal.x = normals[ normalIndex ++ ];
							normal.y = normals[ normalIndex ++ ];
							normal.z = normals[ normalIndex ];

							face.vertexNormals.push( normal );

						}

					}

				
					if ( hasFaceColor ) {

						color = new THREE.Color( faces[ offset ++ ] );
						face.color = color;

					}

					
					if ( hasFaceVertexColor ) {

						for ( i = 0; i < nVertices; i++ ) {

							color = new THREE.Color( faces[ offset ++ ] );
							face.vertexColors.push( color );

						}

					}

					scope.faces.push( face );

				}

			};
			
			function init_skin() {
				
				var i, l, x, y, z, w, a, b, c, d;

				if ( json.skinWeights ) {
					
					for( i = 0, l = json.skinWeights.length; i < l; i += 2 ) {

						x = json.skinWeights[ i     ];
						y = json.skinWeights[ i + 1 ];
						z = 0;
						w = 0;
						
						scope.skinWeights.push( new THREE.Vector4( x, y, z, w ) );

					}
					
				}
				
				if ( json.skinIndices ) {
					
					for( i = 0, l = json.skinIndices.length; i < l; i += 2 ) {

						a = json.skinIndices[ i     ];
						b = json.skinIndices[ i + 1 ];
						c = 0;
						d = 0;

						scope.skinIndices.push( new THREE.Vector4( a, b, c, d ) );

					}
				
				}
				
				scope.bones = json.bones;
				scope.animation = json.animation;
				
			};
			
			Model.prototype = new THREE.Geometry();
			Model.prototype.constructor = Model;

			callback( new Model( texture_path ) );

		}

	},		
	
	init_materials: function( scope, materials, texture_path ) {

		scope.materials = [];

		for ( var i = 0; i < materials.length; ++i ) {

			scope.materials[ i ] = [ THREE.JSONLoader.prototype.createMaterial( materials[ i ], texture_path ) ];

		}

	},

	createMaterial: function ( m, texture_path ) {

		function is_pow2( n ) {

			var l = Math.log(n) / Math.LN2;
			return Math.floor(l) == l;

		}

		function nearest_pow2( n ) {

			var l = Math.log(n) / Math.LN2;
			return Math.pow( 2, Math.round(l) );

		}

		function load_image( where, url ) {
			
			var image = new Image();
			
			image.onload = function () {

				if ( !is_pow2( this.width ) || !is_pow2( this.height ) ) {

					var w = nearest_pow2( this.width ),
						h = nearest_pow2( this.height );

					where.image.width = w;
					where.image.height = h;
					where.image.getContext("2d").drawImage( this, 0, 0, w, h );

				} else {

					where.image = this;

				}

				where.needsUpdate = true;

			};

			image.src = url;
			
		}
		
		var material, mtype, mpars, texture, color;

		// defaults
		
		mtype = "MeshLambertMaterial";
		mpars = { color: 0xeeeeee, opacity: 1.0, map: null, lightMap: null, vertexColors: m.vertexColors };
		
		// parameters from model file
		
		if ( m.shading ) {
			
			if ( m.shading == "Phong" ) mtype = "MeshPhongMaterial";
			
		}
		
		if ( m.mapDiffuse && texture_path ) {

			texture = document.createElement( 'canvas' );
			
			mpars.map = new THREE.Texture( texture );
			mpars.map.sourceFile = m.mapDiffuse;
			
			load_image( mpars.map, texture_path + "/" + m.mapDiffuse );

		} else if ( m.colorDiffuse ) {

			color = ( m.colorDiffuse[0] * 255 << 16 ) + ( m.colorDiffuse[1] * 255 << 8 ) + m.colorDiffuse[2] * 255;
			mpars.color = color;
			mpars.opacity =  m.transparency;

		} else if ( m.DbgColor ) {

			mpars.color = m.DbgColor;

		}

		if ( m.mapLightmap && texture_path ) {

			texture = document.createElement( 'canvas' );
			
			mpars.lightMap = new THREE.Texture( texture );
			mpars.lightMap.sourceFile = m.mapLightmap;
			
			load_image( mpars.lightMap, texture_path + "/" + m.mapLightmap );

		}
		
		material = new THREE[ mtype ]( mpars );

		return material;

	},
	
	extractUrlbase: function( url ) {
		
		var chunks = url.split( "/" );
		chunks.pop();
		return chunks.join( "/" );
		
	}

};