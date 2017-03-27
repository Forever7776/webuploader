(function( $ ){

    ImageUploader =function (selector,url,fileNumLimit,defaultSrc) {

            var $wrap = $(selector);
            $wrap.append('<div class="queueList"></div>');
            // 图片容器
            var $queue = $( '<ul class="filelist"><li class="dndArea" style="border: 3px dashed #e6e6e6;height: 107px;width: 107px;background: url(./image/image.png) center  no-repeat;"><div class="filePicker" style=" width: 100%;height: 100%;"></div> </li></ul>' )
                .appendTo( $wrap.find( '.queueList' )),
            // 没选择文件之前的内容。
            $placeHolder = $wrap.find( '.dndArea' ),

            // 添加的文件数量
            fileCount = 0,

            // 优化retina, 在retina下这个值是2
            ratio = window.devicePixelRatio || 1,

            // 缩略图大小
            thumbnailWidth = 110 * ratio,
            thumbnailHeight = 110 * ratio,

            // 可能有pedding, ready, uploading, confirm, done.
            state = 'pedding',

            // 判断浏览器是否支持图片的base64
            isSupportBase64 = ( function() {
                var data = new Image();
                var support = true;
                data.onload = data.onerror = function() {
                    if( this.width != 1 || this.height != 1 ) {
                        support = false;
                    }
                }
                data.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                return support;
            } )(),
            supportTransition = (function(){
                var s = document.createElement('p').style,
                    r = 'transition' in s ||
                        'WebkitTransition' in s ||
                        'MozTransition' in s ||
                        'msTransition' in s ||
                        'OTransition' in s;
                s = null;
                return r;
            })(),

            // WebUploader实例
            uploader;

        // 实例化
        uploader = WebUploader.create({
            pick: '.filePicker',
            formData: {
                uid: 123
            },
            auto:true,
            dnd: '.dndArea',
            paste: selector,
            // swf: '../../dist/Uploader.swf',
            chunked: false,
            // chunkSize: 512 * 1024,
            server: url,
            // fileVal: 'file',
            // runtimeOrder: 'flash',

            accept: {
                title: 'Images',
                extensions: 'gif,jpg,jpeg,bmp,png',
                mimeTypes: 'image/*'
            },

            // 禁掉全局的拖拽功能。这样不会出现图片拖进页面的时候，把图片打开。
            disableGlobalDnd: true,
            fileNumLimit: fileNumLimit,
            fileSizeLimit: 5 * 1024 * 1024,    // 200 M
            fileSingleSizeLimit: 5 * 1024 * 1024    // 50 M
        });

        // 拖拽时不接受 js, txt 文件。
        uploader.on( 'dndAccept', function( items ) {
            var denied = false,
                len = items.length,
                i = 0,
                // 修改js类型
                unAllowed = 'text/plain;application/javascript ';

            for ( ; i < len; i++ ) {
                // 如果在列表里面
                if ( ~unAllowed.indexOf( items[ i ].type ) ) {
                    denied = true;
                    break;
                }
            }

            return !denied;
        });

        uploader.on('dialogOpen', function() {
            console.log('here');
        });

        uploader.on('ready', function() {
            window.uploader = uploader;
        });

        // 当有文件添加进来时执行，负责view的创建
        function addFile( file ) {
            var $li = $( '<li id="' + file.id + '">' +
                    '<p class="title">' + file.name + '</p>' +
                    '<p class="imgWrap"></p>'+
                    '<p class="progress"><span></span></p>' +
                    '</li>' ),

                $btns = $('<div class="file-panel">' +
                    '<span class="cancel">删除</span>' +
                    '<span class="rotateRight">向右旋转</span>' +
                    '<span class="rotateLeft">向左旋转</span></div>').appendTo( $li ),
                $prgress = $li.find('p.progress span'),
                $wrap = $li.find( 'p.imgWrap' ),
                $info = $('<p class="error"></p>'),

                showError = function( code ) {
                    switch( code ) {
                        case 'exceed_size':
                            text = '文件大小超出';
                            break;

                        case 'interrupt':
                            text = '上传暂停';
                            break;

                        default:
                            text = '上传失败，请重试';
                            break;
                    }

                    $info.text( text ).appendTo( $li );
                };

            if ( file.getStatus() === 'invalid' ) {
                showError( file.statusText );
            } else {
                // @todo lazyload
                $wrap.text( '预览中' );
                uploader.makeThumb( file, function( error, src ) {
                    var img;

                    if ( error ) {
                        $wrap.text( '不能预览' );
                        return;
                    }

                    if( isSupportBase64 ) {
                        img = $('<img src="'+src+'">');
                        $wrap.empty().append( img );
                    }
                }, thumbnailWidth, thumbnailHeight );

                file.rotation = 0;
            }

            file.on('statuschange', function( cur, prev ) {
                if ( prev === 'progress' ) {
                    $prgress.hide().width(0);
                } else if ( prev === 'queued' ) {
                    // $li.off( 'mouseenter mouseleave' );
                    // $btns.remove();
                }

                // 成功
                if ( cur === 'error' || cur === 'invalid' ) {
                    console.log( file.statusText );
                    showError( file.statusText );
                } else if ( cur === 'interrupt' ) {
                    showError( 'interrupt' );
                } else if ( cur === 'queued' ) {
                    $info.remove();
                    $prgress.css('display', 'block');
                } else if ( cur === 'progress' ) {
                    $info.remove();
                    $prgress.css('display', 'block');
                } else if ( cur === 'complete' ) {
                    // $prgress.hide().width(0);
                    $prgress.parent().hide();
                    $li.append( '<span class="success"></span>' );
                }

                $li.removeClass( 'state-' + prev ).addClass( 'state-' + cur );
            });

            $li.on( 'mouseenter', function() {
                $btns.stop().animate({height: 30});
            });

            $li.on( 'mouseleave', function() {
                $btns.stop().animate({height: 0});
            });

            $btns.on( 'click', 'span', function() {
                var index = $(this).index(),
                    deg;

                switch ( index ) {
                    case 0:
                        uploader.removeFile( file );
                        return;

                    case 1:
                        file.rotation += 90;
                        break;

                    case 2:
                        file.rotation -= 90;
                        break;
                }

                if ( supportTransition ) {
                    deg = 'rotate(' + file.rotation + 'deg)';
                    $wrap.css({
                        '-webkit-transform': deg,
                        '-mos-transform': deg,
                        '-o-transform': deg,
                        'transform': deg
                    });
                } else {
                    $wrap.css( 'filter', 'progid:DXImageTransform.Microsoft.BasicImage(rotation='+ (~~((file.rotation/90)%4 + 4)%4) +')');

                }
            });
            $li.prependTo( $queue );
        }

        // 负责view的销毁
        function removeFile( file ) {
            var $li = $('#'+file.id);
            $li.off().find('.file-panel').off().end().remove();
        }



        function setState( val ) {
            var file, stats;

            if ( val === state ) {
                return;
            }
            state = val;

            switch ( state ) {
                case 'pedding':
                    uploader.refresh();
                    break;

                case 'ready':

                    if(fileNumLimit <= fileCount){
                        $placeHolder.addClass( 'element-invisible' );
                    }
                    $queue.show();
                    uploader.refresh();
                    break;

                case 'uploading':
                    break;

                case 'paused':
                    break;

                case 'confirm':
                    stats = uploader.getStats();
                    if ( stats.successNum && !stats.uploadFailNum ) {
                        setState( 'finish' );
                        return;
                    }
                    break;
                case 'finish':
                    stats = uploader.getStats();
                    if ( stats.successNum ) {
                        // alert( '上传成功' );
                    } else {
                        // 没有成功的图片，重设
                        state = 'done';
                        location.reload();
                    }
                    break;
            }

        }

        uploader.onUploadProgress = function( file, percentage ) {
            var $li = $('#'+file.id),
                $percent = $li.find('.progress span');

            $percent.css( 'width', percentage * 100 + '%' );
        };

        uploader.onFileQueued = function( file ) {
            fileCount++;

            if(fileNumLimit <= fileCount){
                $placeHolder.addClass( 'element-invisible' );
            }
            addFile( file );
            setState( 'ready' );
        };

        uploader.onFileDequeued = function( file ) {
            fileCount--;

            if ( !fileCount ) {
                setState( 'pedding' );
            }

            removeFile( file );

            if(fileNumLimit > fileCount){
                $placeHolder.removeClass( 'element-invisible' );
            }

        };

        uploader.onUploadSuccess = function (file, response) {
            if (!response.error ) {
                $('#' + file.id).find('.success').append('<input type="hidden" name="'+$(selector).data('name')+'" value="'+response.result+'"/> ');
            }else{
                alert(response.msg);
            }
            console.log(response);
        };

        uploader.on( 'all', function( type ) {
            var stats;
            switch( type ) {
                case 'uploadFinished':
                    setState( 'confirm' );
                    break;

                case 'startUpload':
                    setState( 'uploading' );
                    break;

                case 'stopUpload':
                    setState( 'paused' );
                    break;

            }
        });

        uploader.onError = function( code ) {
            alert( 'Eroor: ' + code );
        };


        if(defaultSrc){
            defaultImage();
        }
        function defaultImage()
        {
            var $li = $( '<li id="' + 'DEFAULT_IMAGE' + '0' + '">' +
                    '<p class="imgWrap"><img src="'+defaultSrc+'"/></p>'+
                    '</li>' ),
                $btns = $('<div class="file-panel">' +
                    '<span class="cancel">删除</span></div>').appendTo( $li );
            $li.on( 'mouseenter', function() {
                $btns.stop().animate({height: 30});
            });

            $li.on( 'mouseleave', function() {
                $btns.stop().animate({height: 0});
            });
            $btns.on( 'click', 'span', function() {
                removeFile({id:$li.attr('id')});
                if(fileNumLimit > --fileCount){
                    $placeHolder.removeClass( 'element-invisible' );
                }
            });
            $li.prependTo( $queue );
            fileCount++;
            setState('ready');
        }



    };





})( jQuery );
