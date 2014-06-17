/**
 * Created with IntelliJ IDEA.
 * User: Ganaraj.Pr
 * Date: 11/10/13
 * Time: 11:27
 * To change this template use File | Settings | File Templates.
 */
if (window.jQuery && (-1 == window.jQuery.event.props.indexOf("dataTransfer"))) {
    window.jQuery.event.props.push("dataTransfer");
}

angular.module("ngDragDrop",[])
    .directive("uiDraggable", [
        '$parse',
        '$rootScope',
        function ($parse, $rootScope) {

            //Is that direct the link function?
            //No element restriction?
            return function (scope, element, attrs) {
                var dragData = "",
                    isDragHandleUsed = false,
                    dragHandleClass,
                    dragHandles,
                    dragTarget;

                //Saying current element is not draggable? Should be other way :S
                element.attr("draggable", false);

                //ui-draggable="true": Indicates element is draggable
                attrs.$observe("uiDraggable", function (newValue) {
                    element.attr("draggable", newValue);
                });

                //data to be send with the drag event
                if (attrs.drag) {
                    scope.$watch(attrs.drag, function (newValue) {
                        dragData = newValue || "";
                    });
                }

                /*
                * see https://yuilibrary.com/yui/docs/dd/#handles
                * Drag handles allow you to specify what element will initiate a drag. For example, you may want the
                * entire element to be able to be dragged, but you only want them to click on the header to do that
                * (in case you have content that will not react well to a drag, like an input or an anchor).
                 */
                if (angular.isString(attrs.dragHandleClass)) {
                    isDragHandleUsed = true;
                    dragHandleClass = attrs.dragHandleClass.trim() || "drag-handle";
                    dragHandles = element.find('.' + dragHandleClass).toArray();

                    element.bind("mousedown", function (e) {
                        dragTarget = e.target;
                    });
                }


                element.bind("dragstart", function (e) {
                    var isDragAllowed = !isDragHandleUsed || -1 != dragHandles.indexOf(dragTarget);

                    if (isDragAllowed) {
                        var sendData = angular.toJson(dragData);
                        var sendChannel = attrs.dragChannel || "defaultchannel";
                        var dragImage = attrs.dragImage || null;
                        if (dragImage) {
                            var dragImageFn = $parse(attrs.dragImage);
                            scope.$apply(function() {
                                var dragImageParameters = dragImageFn(scope, {$event: e});
                                if (dragImageParameters && dragImageParameters.image) {
                                    var xOffset = dragImageParameters.xOffset || 0,
                                        yOffset = dragImageParameters.yOffset || 0;
                                    e.dataTransfer.setDragImage(dragImageParameters.image, xOffset, yOffset);
                                }
                            });
                        }

                        e.dataTransfer.setData("text/plain", sendData);
                        e.dataTransfer.effectAllowed = "copyMove";

                        /*
                        * Inform elements that a drag is starting. then the droppables can bind the required drop events
                        * In this way we only activate the interested elements.
                         */
                        $rootScope.$broadcast("ANGULAR_DRAG_START", sendChannel);
                    }
                    else {
                        e.preventDefault();
                    }
                });


                element.bind("dragend", function (e) {
                    /*
                     * the send channel allow to indicate wich elements can be connected through a drag and drop action
                     * ex: bce.user.channel, bce.task.channel, ...
                     */
                    var sendChannel = attrs.dragChannel || "defaultchannel";

                    /*
                    * The drag is over and all droppables can now detach the droppable events
                     */
                    $rootScope.$broadcast("ANGULAR_DRAG_END", sendChannel);

                    if (e.dataTransfer && e.dataTransfer.dropEffect !== "none") {
                        if (attrs.onDropSuccess) {
                            var fn = $parse(attrs.onDropSuccess);

                            /*
                            * Inform the draggable scope that the drop has been succesful and invoking the given
                            * callback in the element
                             */
                            scope.$apply(function () {
                                fn(scope, {$event: e});
                            });
                        }
                    }
                });


            };
        }
    ])
    .directive("uiOnDrop", [
        '$parse',
        '$rootScope',
        function ($parse, $rootScope) {
            return function (scope, element, attr) {
                var dragging = 0; //Ref. http://stackoverflow.com/a/10906204
                var dropChannel = "defaultchannel";
                var dragChannel = "";
                var dragEnterClass = attr.dragEnterClass || "on-drag-enter";
                var dragHoverClass = attr.dragHoverClass || "on-drag-hover";

                function onDragOver(e) {
                    if (e.preventDefault) {
                        e.preventDefault(); // Necessary. Allows us to drop.
                    }

                    if (e.stopPropagation) {
                        e.stopPropagation();
                    }

                    e.dataTransfer.dropEffect = e.shiftKey ? 'copy' : 'move';
                    return false;
                }

                function onDragLeave(e) {
                    dragging--;
                    if (dragging == 0) {
                        element.removeClass(dragHoverClass);
                    }
                }

                function onDragEnter(e) {
                    dragging++;
                    $rootScope.$broadcast("ANGULAR_HOVER", dropChannel);
                    element.addClass(dragHoverClass);
                }

                function onDrop(e) {
                    if (e.preventDefault) {
                        e.preventDefault(); // Necessary. Allows us to drop.
                    }
                    if (e.stopPropagation) {
                        e.stopPropagation(); // Necessary. Allows us to drop.
                    }
                    var data = e.dataTransfer.getData("text/plain");
                    data = angular.fromJson(data);
                    var fn = $parse(attr.uiOnDrop);

                    /*
                    * inform scope that a drop has been performed
                     */
                    scope.$apply(function () {
                        fn(scope, {$data: data, $event: e});
                    });
                    element.removeClass(dragEnterClass);
                }

                /*
                * test is the drag corresponds to an accepted channel.
                 */
                function isDragChannelAccepted(dragChannel, dropChannel) {
                    if (dropChannel === "*") {
                        return true;
                    }

                    var channelMatchPattern = new RegExp("(\\s|[,])+(" + dragChannel + ")(\\s|[,])+", "i");

                    return channelMatchPattern.test("," + dropChannel + ",");
                }

                /*
                * When a drag begins in the same channel the listeners are bound.
                *
                 */
                $rootScope.$on("ANGULAR_DRAG_START", function (event, channel) {
                    dragChannel = channel;
                    if (isDragChannelAccepted(dragChannel, dropChannel)) {

                        element.bind("dragover", onDragOver);
                        element.bind("dragenter", onDragEnter);
                        element.bind("dragleave", onDragLeave);

                        element.bind("drop", onDrop);
                        element.addClass(dragEnterClass);
                    }

                });



                $rootScope.$on("ANGULAR_DRAG_END", function (e, channel) {
                    dragChannel = "";
                    if (isDragChannelAccepted(channel, dropChannel)) {

                        element.unbind("dragover", onDragOver);
                        element.unbind("dragenter", onDragEnter);
                        element.unbind("dragleave", onDragLeave);

                        element.unbind("drop", onDrop);
                        element.removeClass(dragHoverClass);
                        element.removeClass(dragEnterClass);
                    }
                });


                $rootScope.$on("ANGULAR_HOVER", function (e, channel) {
                    if (isDragChannelAccepted(channel, dropChannel)) {
                        element.removeClass(dragHoverClass);
                    }
                });

                attr.$observe('dropChannel', function (value) {
                    if (value) {
                        dropChannel = value;
                    }
                });


            };
        }
    ]);