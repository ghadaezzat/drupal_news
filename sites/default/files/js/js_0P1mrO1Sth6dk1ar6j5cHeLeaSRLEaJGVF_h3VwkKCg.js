(function ($) {

/**
 * Attaches double-click behavior to toggle full path of Krumo elements.
 */
Drupal.behaviors.devel = {
  attach: function (context, settings) {

    // Add hint to footnote
    $('.krumo-footnote .krumo-call').once().before('<img style="vertical-align: middle;" title="Click to expand. Double-click to show path." src="' + settings.basePath + 'misc/help.png"/>');

    var krumo_name = [];
    var krumo_type = [];

    function krumo_traverse(el) {
      krumo_name.push($(el).html());
      krumo_type.push($(el).siblings('em').html().match(/\w*/)[0]);

      if ($(el).closest('.krumo-nest').length > 0) {
        krumo_traverse($(el).closest('.krumo-nest').prev().find('.krumo-name'));
      }
    }

    $('.krumo-child > div:first-child', context).dblclick(
      function(e) {
        if ($(this).find('> .krumo-php-path').length > 0) {
          // Remove path if shown.
          $(this).find('> .krumo-php-path').remove();
        }
        else {
          // Get elements.
          krumo_traverse($(this).find('> a.krumo-name'));

          // Create path.
          var krumo_path_string = '';
          for (var i = krumo_name.length - 1; i >= 0; --i) {
            // Start element.
            if ((krumo_name.length - 1) == i)
              krumo_path_string += '$' + krumo_name[i];

            if (typeof krumo_name[(i-1)] !== 'undefined') {
              if (krumo_type[i] == 'Array') {
                krumo_path_string += "[";
                if (!/^\d*$/.test(krumo_name[(i-1)]))
                  krumo_path_string += "'";
                krumo_path_string += krumo_name[(i-1)];
                if (!/^\d*$/.test(krumo_name[(i-1)]))
                  krumo_path_string += "'";
                krumo_path_string += "]";
              }
              if (krumo_type[i] == 'Object')
                krumo_path_string += '->' + krumo_name[(i-1)];
            }
          }
          $(this).append('<div class="krumo-php-path" style="font-family: Courier, monospace; font-weight: bold;">' + krumo_path_string + '</div>');

          // Reset arrays.
          krumo_name = [];
          krumo_type = [];
        }
      }
    );
  }
};

})(jQuery);
;
(function ($) {

/**
 * Toggle the visibility of a fieldset using smooth animations.
 */
Drupal.toggleFieldset = function (fieldset) {
  var $fieldset = $(fieldset);
  if ($fieldset.is('.collapsed')) {
    var $content = $('> .fieldset-wrapper', fieldset).hide();
    $fieldset
      .removeClass('collapsed')
      .trigger({ type: 'collapsed', value: false })
      .find('> legend span.fieldset-legend-prefix').html(Drupal.t('Hide'));
    $content.slideDown({
      duration: 'fast',
      easing: 'linear',
      complete: function () {
        Drupal.collapseScrollIntoView(fieldset);
        fieldset.animating = false;
      },
      step: function () {
        // Scroll the fieldset into view.
        Drupal.collapseScrollIntoView(fieldset);
      }
    });
  }
  else {
    $fieldset.trigger({ type: 'collapsed', value: true });
    $('> .fieldset-wrapper', fieldset).slideUp('fast', function () {
      $fieldset
        .addClass('collapsed')
        .find('> legend span.fieldset-legend-prefix').html(Drupal.t('Show'));
      fieldset.animating = false;
    });
  }
};

/**
 * Scroll a given fieldset into view as much as possible.
 */
Drupal.collapseScrollIntoView = function (node) {
  var h = document.documentElement.clientHeight || document.body.clientHeight || 0;
  var offset = document.documentElement.scrollTop || document.body.scrollTop || 0;
  var posY = $(node).offset().top;
  var fudge = 55;
  if (posY + node.offsetHeight + fudge > h + offset) {
    if (node.offsetHeight > h) {
      window.scrollTo(0, posY);
    }
    else {
      window.scrollTo(0, posY + node.offsetHeight - h + fudge);
    }
  }
};

Drupal.behaviors.collapse = {
  attach: function (context, settings) {
    $('fieldset.collapsible', context).once('collapse', function () {
      var $fieldset = $(this);
      // Expand fieldset if there are errors inside, or if it contains an
      // element that is targeted by the URI fragment identifier.
      var anchor = location.hash && location.hash != '#' ? ', ' + location.hash : '';
      if ($fieldset.find('.error' + anchor).length) {
        $fieldset.removeClass('collapsed');
      }

      var summary = $('<span class="summary"></span>');
      $fieldset.
        bind('summaryUpdated', function () {
          var text = $.trim($fieldset.drupalGetSummary());
          summary.html(text ? ' (' + text + ')' : '');
        })
        .trigger('summaryUpdated');

      // Turn the legend into a clickable link, but retain span.fieldset-legend
      // for CSS positioning.
      var $legend = $('> legend .fieldset-legend', this);

      $('<span class="fieldset-legend-prefix element-invisible"></span>')
        .append($fieldset.hasClass('collapsed') ? Drupal.t('Show') : Drupal.t('Hide'))
        .prependTo($legend)
        .after(' ');

      // .wrapInner() does not retain bound events.
      var $link = $('<a class="fieldset-title" href="#"></a>')
        .prepend($legend.contents())
        .appendTo($legend)
        .click(function () {
          var fieldset = $fieldset.get(0);
          // Don't animate multiple times.
          if (!fieldset.animating) {
            fieldset.animating = true;
            Drupal.toggleFieldset(fieldset);
          }
          return false;
        });

      $legend.append(summary);
    });
  }
};

})(jQuery);
;
(function ($) {

/**
 * Retrieves the summary for the first element.
 */
$.fn.drupalGetSummary = function () {
  var callback = this.data('summaryCallback');
  return (this[0] && callback) ? $.trim(callback(this[0])) : '';
};

/**
 * Sets the summary for all matched elements.
 *
 * @param callback
 *   Either a function that will be called each time the summary is
 *   retrieved or a string (which is returned each time).
 */
$.fn.drupalSetSummary = function (callback) {
  var self = this;

  // To facilitate things, the callback should always be a function. If it's
  // not, we wrap it into an anonymous function which just returns the value.
  if (typeof callback != 'function') {
    var val = callback;
    callback = function () { return val; };
  }

  return this
    .data('summaryCallback', callback)
    // To prevent duplicate events, the handlers are first removed and then
    // (re-)added.
    .unbind('formUpdated.summary')
    .bind('formUpdated.summary', function () {
      self.trigger('summaryUpdated');
    })
    // The actual summaryUpdated handler doesn't fire when the callback is
    // changed, so we have to do this manually.
    .trigger('summaryUpdated');
};

/**
 * Sends a 'formUpdated' event each time a form element is modified.
 */
Drupal.behaviors.formUpdated = {
  attach: function (context) {
    // These events are namespaced so that we can remove them later.
    var events = 'change.formUpdated click.formUpdated blur.formUpdated keyup.formUpdated';
    $(context)
      // Since context could be an input element itself, it's added back to
      // the jQuery object and filtered again.
      .find(':input').andSelf().filter(':input')
      // To prevent duplicate events, the handlers are first removed and then
      // (re-)added.
      .unbind(events).bind(events, function () {
        $(this).trigger('formUpdated');
      });
  }
};

/**
 * Prepopulate form fields with information from the visitor cookie.
 */
Drupal.behaviors.fillUserInfoFromCookie = {
  attach: function (context, settings) {
    $('form.user-info-from-cookie').once('user-info-from-cookie', function () {
      var formContext = this;
      $.each(['name', 'mail', 'homepage'], function () {
        var $element = $('[name=' + this + ']', formContext);
        var cookie = $.cookie('Drupal.visitor.' + this);
        if ($element.length && cookie) {
          $element.val(cookie);
        }
      });
    });
  }
};

})(jQuery);
;
/*!
 * jCarousel - Riding carousels with jQuery
 *   http://sorgalla.com/jcarousel/
 *
 * Copyright (c) 2006 Jan Sorgalla (http://sorgalla.com)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Built on top of the jQuery library
 *   http://jquery.com
 *
 * Inspired by the "Carousel Component" by Bill Scott
 *   http://billwscott.com/carousel/
 */

(function(c){var d={vertical:false,rtl:false,start:1,offset:1,size:null,scroll:3,visible:null,animation:"normal",easing:"swing",auto:0,wrap:null,initCallback:null,setupCallback:null,reloadCallback:null,itemLoadCallback:null,itemFirstInCallback:null,itemFirstOutCallback:null,itemLastInCallback:null,itemLastOutCallback:null,itemVisibleInCallback:null,itemVisibleOutCallback:null,animationStepCallback:null,buttonNextHTML:"<div></div>",buttonPrevHTML:"<div></div>",buttonNextEvent:"click",buttonPrevEvent:"click",buttonNextCallback:null,buttonPrevCallback:null,itemFallbackDimension:null},b=false;c(window).bind("load.jcarousel",function(){b=true});c.jcarousel=function(l,g){this.options=c.extend({},d,g||{});this.locked=false;this.autoStopped=false;this.container=null;this.clip=null;this.list=null;this.buttonNext=null;this.buttonPrev=null;this.buttonNextState=null;this.buttonPrevState=null;if(!g||g.rtl===undefined){this.options.rtl=(c(l).attr("dir")||c("html").attr("dir")||"").toLowerCase()=="rtl"}this.wh=!this.options.vertical?"width":"height";this.lt=!this.options.vertical?(this.options.rtl?"right":"left"):"top";var q="",n=l.className.split(" ");for(var k=0;k<n.length;k++){if(n[k].indexOf("jcarousel-skin")!=-1){c(l).removeClass(n[k]);q=n[k];break}}if(l.nodeName.toUpperCase()=="UL"||l.nodeName.toUpperCase()=="OL"){this.list=c(l);this.clip=this.list.parents(".jcarousel-clip");this.container=this.list.parents(".jcarousel-container")}else{this.container=c(l);this.list=this.container.find("ul,ol").eq(0);this.clip=this.container.find(".jcarousel-clip")}if(this.clip.size()===0){this.clip=this.list.wrap("<div></div>").parent()}if(this.container.size()===0){this.container=this.clip.wrap("<div></div>").parent()}if(q!==""&&this.container.parent()[0].className.indexOf("jcarousel-skin")==-1){this.container.wrap('<div class=" '+q+'"></div>')}this.buttonPrev=c(".jcarousel-prev",this.container);if(this.buttonPrev.size()===0&&this.options.buttonPrevHTML!==null){this.buttonPrev=c(this.options.buttonPrevHTML).appendTo(this.container)}this.buttonPrev.addClass(this.className("jcarousel-prev"));this.buttonNext=c(".jcarousel-next",this.container);if(this.buttonNext.size()===0&&this.options.buttonNextHTML!==null){this.buttonNext=c(this.options.buttonNextHTML).appendTo(this.container)}this.buttonNext.addClass(this.className("jcarousel-next"));this.clip.addClass(this.className("jcarousel-clip")).css({position:"relative"});this.list.addClass(this.className("jcarousel-list")).css({overflow:"hidden",position:"relative",top:0,margin:0,padding:0}).css((this.options.rtl?"right":"left"),0);this.container.addClass(this.className("jcarousel-container")).css({position:"relative"});if(!this.options.vertical&&this.options.rtl){this.container.addClass("jcarousel-direction-rtl").attr("dir","rtl")}var m=this.options.visible!==null?Math.ceil(this.clipping()/this.options.visible):null;var p=this.list.children("li");var r=this;if(p.size()>0){var f=0,h=this.options.offset;p.each(function(){r.format(this,h++);f+=r.dimension(this,m)});this.list.css(this.wh,(f+100)+"px");if(!g||g.size===undefined){this.options.size=p.size()}}this.container.css("display","block");this.buttonNext.css("display","block");this.buttonPrev.css("display","block");this.funcNext=function(){r.next();return false};this.funcPrev=function(){r.prev();return false};this.funcResize=function(){if(r.resizeTimer){clearTimeout(r.resizeTimer)}r.resizeTimer=setTimeout(function(){r.reload()},100)};if(this.options.initCallback!==null){this.options.initCallback(this,"init")}if(!b&&a.isSafari()){this.buttons(false,false);c(window).bind("load.jcarousel",function(){r.setup()})}else{this.setup()}};var a=c.jcarousel;a.fn=a.prototype={jcarousel:"0.2.9"};a.fn.extend=a.extend=c.extend;a.fn.extend({setup:function(){this.first=null;this.last=null;this.prevFirst=null;this.prevLast=null;this.animating=false;this.timer=null;this.resizeTimer=null;this.tail=null;this.inTail=false;if(this.locked){return}this.list.css(this.lt,this.pos(this.options.offset)+"px");var e=this.pos(this.options.start,true);this.prevFirst=this.prevLast=null;this.animate(e,false);c(window).unbind("resize.jcarousel",this.funcResize).bind("resize.jcarousel",this.funcResize);if(this.options.setupCallback!==null){this.options.setupCallback(this)}},reset:function(){this.list.empty();this.list.css(this.lt,"0px");this.list.css(this.wh,"10px");if(this.options.initCallback!==null){this.options.initCallback(this,"reset")}this.setup()},reload:function(){if(this.tail!==null&&this.inTail){this.list.css(this.lt,a.intval(this.list.css(this.lt))+this.tail)}this.tail=null;this.inTail=false;if(this.options.reloadCallback!==null){this.options.reloadCallback(this)}if(this.options.visible!==null){var g=this;var h=Math.ceil(this.clipping()/this.options.visible),f=0,e=0;this.list.children("li").each(function(j){f+=g.dimension(this,h);if(parseInt(jQuery(this).attr("jcarouselindex"))<g.first){e=f}});this.list.css(this.wh,f+"px");this.list.css(this.lt,-e+"px")}this.scroll(this.first,false)},lock:function(){this.locked=true;this.buttons()},unlock:function(){this.locked=false;this.buttons()},size:function(e){if(e!==undefined){this.options.size=e;if(!this.locked){this.buttons()}}return this.options.size},has:function(g,h){if(h===undefined||!h){h=g}if(this.options.size!==null&&h>this.options.size){h=this.options.size}for(var f=g;f<=h;f++){var k=this.get(f);if(!k.length||k.hasClass("jcarousel-item-placeholder")){return false}}return true},get:function(e){return c(">.jcarousel-item-"+e,this.list)},add:function(l,q){var m=this.get(l),h=0,g=c(q);if(m.length===0){var p,k=a.intval(l);m=this.create(l);while(true){p=this.get(--k);if(k<=0||p.length){if(k<=0){this.list.prepend(m)}else{p.after(m)}break}}}else{h=this.dimension(m)}if(g.get(0).nodeName.toUpperCase()=="LI"){m.replaceWith(g);m=g}else{m.empty().append(q)}this.format(m.removeClass(this.className("jcarousel-item-placeholder")),l);var o=this.options.visible!==null?Math.ceil(this.clipping()/this.options.visible):null;var f=this.dimension(m,o)-h;if(l>0&&l<this.first){this.list.css(this.lt,a.intval(this.list.css(this.lt))-f+"px")}this.list.css(this.wh,a.intval(this.list.css(this.wh))+f+"px");return m},remove:function(f){var g=this.get(f);if(!g.length||(f>=this.first&&f<=this.last)){return}var h=this.dimension(g);if(f<this.first){this.list.css(this.lt,a.intval(this.list.css(this.lt))+h+"px")}g.remove();this.list.css(this.wh,a.intval(this.list.css(this.wh))-h+"px")},next:function(){if(this.tail!==null&&!this.inTail){this.scrollTail(false)}else{this.scroll(((this.options.wrap=="both"||this.options.wrap=="last")&&this.options.size!==null&&this.last==this.options.size)?1:this.first+this.options.scroll)}},prev:function(){if(this.tail!==null&&this.inTail){this.scrollTail(true)}else{this.scroll(((this.options.wrap=="both"||this.options.wrap=="first")&&this.options.size!==null&&this.first==1)?this.options.size:this.first-this.options.scroll)}},scrollTail:function(e){if(this.locked||this.animating||!this.tail){return}this.pauseAuto();var f=a.intval(this.list.css(this.lt));f=!e?f-this.tail:f+this.tail;this.inTail=!e;this.prevFirst=this.first;this.prevLast=this.last;this.animate(f)},scroll:function(f,e){if(this.locked||this.animating){return}this.pauseAuto();this.animate(this.pos(f),e)},pos:function(C,k){var n=a.intval(this.list.css(this.lt));if(this.locked||this.animating){return n}if(this.options.wrap!="circular"){C=C<1?1:(this.options.size&&C>this.options.size?this.options.size:C)}var z=this.first>C;var E=this.options.wrap!="circular"&&this.first<=1?1:this.first;var H=z?this.get(E):this.get(this.last);var B=z?E:E-1;var F=null,A=0,w=false,G=0,D;while(z?--B>=C:++B<C){F=this.get(B);w=!F.length;if(F.length===0){F=this.create(B).addClass(this.className("jcarousel-item-placeholder"));H[z?"before":"after"](F);if(this.first!==null&&this.options.wrap=="circular"&&this.options.size!==null&&(B<=0||B>this.options.size)){D=this.get(this.index(B));if(D.length){F=this.add(B,D.clone(true))}}}H=F;G=this.dimension(F);if(w){A+=G}if(this.first!==null&&(this.options.wrap=="circular"||(B>=1&&(this.options.size===null||B<=this.options.size)))){n=z?n+G:n-G}}var s=this.clipping(),u=[],h=0,t=0;H=this.get(C-1);B=C;while(++h){F=this.get(B);w=!F.length;if(F.length===0){F=this.create(B).addClass(this.className("jcarousel-item-placeholder"));if(H.length===0){this.list.prepend(F)}else{H[z?"before":"after"](F)}if(this.first!==null&&this.options.wrap=="circular"&&this.options.size!==null&&(B<=0||B>this.options.size)){D=this.get(this.index(B));if(D.length){F=this.add(B,D.clone(true))}}}H=F;G=this.dimension(F);if(G===0){throw new Error("jCarousel: No width/height set for items. This will cause an infinite loop. Aborting...")}if(this.options.wrap!="circular"&&this.options.size!==null&&B>this.options.size){u.push(F)}else{if(w){A+=G}}t+=G;if(t>=s){break}B++}for(var r=0;r<u.length;r++){u[r].remove()}if(A>0){this.list.css(this.wh,this.dimension(this.list)+A+"px");if(z){n-=A;this.list.css(this.lt,a.intval(this.list.css(this.lt))-A+"px")}}var q=C+h-1;if(this.options.wrap!="circular"&&this.options.size&&q>this.options.size){q=this.options.size}if(B>q){h=0;B=q;t=0;while(++h){F=this.get(B--);if(!F.length){break}t+=this.dimension(F);if(t>=s){break}}}var o=q-h+1;if(this.options.wrap!="circular"&&o<1){o=1}if(this.inTail&&z){n+=this.tail;this.inTail=false}this.tail=null;if(this.options.wrap!="circular"&&q==this.options.size&&(q-h+1)>=1){var y=a.intval(this.get(q).css(!this.options.vertical?"marginRight":"marginBottom"));if((t-y)>s){this.tail=t-s-y}}if(k&&C===this.options.size&&this.tail){n-=this.tail;this.inTail=true}while(C-->o){n+=this.dimension(this.get(C))}this.prevFirst=this.first;this.prevLast=this.last;this.first=o;this.last=q;return n},animate:function(i,e){if(this.locked||this.animating){return}this.animating=true;var f=this;var g=function(){f.animating=false;if(i===0){f.list.css(f.lt,0)}if(!f.autoStopped&&(f.options.wrap=="circular"||f.options.wrap=="both"||f.options.wrap=="last"||f.options.size===null||f.last<f.options.size||(f.last==f.options.size&&f.tail!==null&&!f.inTail))){f.startAuto()}f.buttons();f.notify("onAfterAnimation");if(f.options.wrap=="circular"&&f.options.size!==null){for(var k=f.prevFirst;k<=f.prevLast;k++){if(k!==null&&!(k>=f.first&&k<=f.last)&&(k<1||k>f.options.size)){f.remove(k)}}}};this.notify("onBeforeAnimation");if(!this.options.animation||e===false){this.list.css(this.lt,i+"px");g()}else{var j=!this.options.vertical?(this.options.rtl?{right:i}:{left:i}):{top:i};var h={duration:this.options.animation,easing:this.options.easing,complete:g};if(c.isFunction(this.options.animationStepCallback)){h.step=this.options.animationStepCallback}this.list.animate(j,h)}},startAuto:function(f){if(f!==undefined){this.options.auto=f}if(this.options.auto===0){return this.stopAuto()}if(this.timer!==null){return}this.autoStopped=false;var e=this;this.timer=window.setTimeout(function(){e.next()},this.options.auto*1000)},stopAuto:function(){this.pauseAuto();this.autoStopped=true},pauseAuto:function(){if(this.timer===null){return}window.clearTimeout(this.timer);this.timer=null},buttons:function(g,f){if(g==null){g=!this.locked&&this.options.size!==0&&((this.options.wrap&&this.options.wrap!="first")||this.options.size===null||this.last<this.options.size);if(!this.locked&&(!this.options.wrap||this.options.wrap=="first")&&this.options.size!==null&&this.last>=this.options.size){g=this.tail!==null&&!this.inTail}}if(f==null){f=!this.locked&&this.options.size!==0&&((this.options.wrap&&this.options.wrap!="last")||this.first>1);if(!this.locked&&(!this.options.wrap||this.options.wrap=="last")&&this.options.size!==null&&this.first==1){f=this.tail!==null&&this.inTail}}var e=this;if(this.buttonNext.size()>0){this.buttonNext.unbind(this.options.buttonNextEvent+".jcarousel",this.funcNext);if(g){this.buttonNext.bind(this.options.buttonNextEvent+".jcarousel",this.funcNext)}this.buttonNext[g?"removeClass":"addClass"](this.className("jcarousel-next-disabled")).attr("disabled",g?false:true);if(this.options.buttonNextCallback!==null&&this.buttonNext.data("jcarouselstate")!=g){this.buttonNext.each(function(){e.options.buttonNextCallback(e,this,g)}).data("jcarouselstate",g)}}else{if(this.options.buttonNextCallback!==null&&this.buttonNextState!=g){this.options.buttonNextCallback(e,null,g)}}if(this.buttonPrev.size()>0){this.buttonPrev.unbind(this.options.buttonPrevEvent+".jcarousel",this.funcPrev);if(f){this.buttonPrev.bind(this.options.buttonPrevEvent+".jcarousel",this.funcPrev)}this.buttonPrev[f?"removeClass":"addClass"](this.className("jcarousel-prev-disabled")).attr("disabled",f?false:true);if(this.options.buttonPrevCallback!==null&&this.buttonPrev.data("jcarouselstate")!=f){this.buttonPrev.each(function(){e.options.buttonPrevCallback(e,this,f)}).data("jcarouselstate",f)}}else{if(this.options.buttonPrevCallback!==null&&this.buttonPrevState!=f){this.options.buttonPrevCallback(e,null,f)}}this.buttonNextState=g;this.buttonPrevState=f},notify:function(e){var f=this.prevFirst===null?"init":(this.prevFirst<this.first?"next":"prev");this.callback("itemLoadCallback",e,f);if(this.prevFirst!==this.first){this.callback("itemFirstInCallback",e,f,this.first);this.callback("itemFirstOutCallback",e,f,this.prevFirst)}if(this.prevLast!==this.last){this.callback("itemLastInCallback",e,f,this.last);this.callback("itemLastOutCallback",e,f,this.prevLast)}this.callback("itemVisibleInCallback",e,f,this.first,this.last,this.prevFirst,this.prevLast);this.callback("itemVisibleOutCallback",e,f,this.prevFirst,this.prevLast,this.first,this.last)},callback:function(j,m,e,k,h,g,f){if(this.options[j]==null||(typeof this.options[j]!="object"&&m!="onAfterAnimation")){return}var n=typeof this.options[j]=="object"?this.options[j][m]:this.options[j];if(!c.isFunction(n)){return}var o=this;if(k===undefined){n(o,e,m)}else{if(h===undefined){this.get(k).each(function(){n(o,this,k,e,m)})}else{var p=function(q){o.get(q).each(function(){n(o,this,q,e,m)})};for(var l=k;l<=h;l++){if(l!==null&&!(l>=g&&l<=f)){p(l)}}}}},create:function(e){return this.format("<li></li>",e)},format:function(k,h){k=c(k);var g=k.get(0).className.split(" ");for(var f=0;f<g.length;f++){if(g[f].indexOf("jcarousel-")!=-1){k.removeClass(g[f])}}k.addClass(this.className("jcarousel-item")).addClass(this.className("jcarousel-item-"+h)).css({"float":(this.options.rtl?"right":"left"),"list-style":"none"}).attr("jcarouselindex",h);return k},className:function(e){return e+" "+e+(!this.options.vertical?"-horizontal":"-vertical")},dimension:function(h,i){var g=c(h);if(i==null){return !this.options.vertical?((g.innerWidth()+a.intval(g.css("margin-left"))+a.intval(g.css("margin-right"))+a.intval(g.css("border-left-width"))+a.intval(g.css("border-right-width")))||a.intval(this.options.itemFallbackDimension)):((g.innerHeight()+a.intval(g.css("margin-top"))+a.intval(g.css("margin-bottom"))+a.intval(g.css("border-top-width"))+a.intval(g.css("border-bottom-width")))||a.intval(this.options.itemFallbackDimension))}else{var f=!this.options.vertical?i-a.intval(g.css("marginLeft"))-a.intval(g.css("marginRight")):i-a.intval(g.css("marginTop"))-a.intval(g.css("marginBottom"));c(g).css(this.wh,f+"px");return this.dimension(g)}},clipping:function(){return !this.options.vertical?this.clip[0].offsetWidth-a.intval(this.clip.css("borderLeftWidth"))-a.intval(this.clip.css("borderRightWidth")):this.clip[0].offsetHeight-a.intval(this.clip.css("borderTopWidth"))-a.intval(this.clip.css("borderBottomWidth"))},index:function(e,f){if(f==null){f=this.options.size}return Math.round((((e-1)/f)-Math.floor((e-1)/f))*f)+1}});a.extend({defaults:function(e){return c.extend(d,e||{})},intval:function(e){e=parseInt(e,10);return isNaN(e)?0:e},windowLoaded:function(){b=true},isSafari:function(){var g=navigator.userAgent.toLowerCase(),f=/(chrome)[ \/]([\w.]+)/.exec(g)||/(webkit)[ \/]([\w.]+)/.exec(g)||[],e=f[1]||"";return e==="webkit"}});c.fn.jcarousel=function(g){if(typeof g=="string"){var e=c(this).data("jcarousel"),f=Array.prototype.slice.call(arguments,1);return e[g].apply(e,f)}else{return this.each(function(){var h=c(this).data("jcarousel");if(h){if(g){c.extend(h.options,g)}h.reload()}else{c(this).data("jcarousel",new a(this,g))}})}}})(jQuery);
;
/**
 * @file
 * Add jCarousel behaviors to the page and provide Views-support.
 */

(function($) {

Drupal.behaviors.jcarousel = {};
Drupal.behaviors.jcarousel.attach = function(context, settings) {
  settings = settings || Drupal.settings;

  // If no carousels exist on this part of the page, work no further. 
  if (!settings.jcarousel || !settings.jcarousel.carousels) {
    return;
  }

  $("ul.jcarousel li").css("display", "");

  $.each(settings.jcarousel.carousels, function(key, options) {
    var $carousel = $(options.selector + ':not(.jcarousel-processed)', context);

    // If this carousel has already been processed or doesn't exist, move on.
    if (!$carousel.length) {
      return;
    }

    // Callbacks need to be converted from a string to an actual function.
    $.each(options, function(optionKey) {
      if (optionKey.match(/Callback$/) && typeof options[optionKey] == 'string') {
        var callbackFunction = window;
        var callbackParents = options[optionKey].split('.');
        $.each(callbackParents, function(objectParent) {
          callbackFunction = callbackFunction[callbackParents[objectParent]];
        });
        options[optionKey] = callbackFunction;
      }
    });

    // Add standard options required for AJAX functionality.
    if (options.ajax && !options.itemLoadCallback) {
      options.itemLoadCallback = Drupal.jcarousel.ajaxLoadCallback;
    }

    // If auto-scrolling, pause animation when hoving over the carousel.
    if (options.auto && options.autoPause && !options.initCallback) {
      options.initCallback = function(carousel, state) {
        Drupal.jcarousel.autoPauseCallback(carousel, state);
      };
    }

    // Add responsive behavior.
    if (options.responsive  && !options.reloadCallback) {
      options.vertical = false;
      options.visible = null;
      options.reloadCallback = Drupal.jcarousel.reloadCallback;
    }

    // Add navigation to the carousel if enabled.
    if (!options.setupCallback) {
      options.setupCallback = function(carousel) {
        Drupal.jcarousel.setupCarousel(carousel);
        if (options.navigation) {
          Drupal.jcarousel.addNavigation(carousel, options.navigation);
        }
        if (options.responsive) {
          carousel.reload();
        }
      };
      if (options.navigation && !options.itemVisibleInCallback) {
        options.itemLastInCallback = {
          onAfterAnimation: Drupal.jcarousel.updateNavigationActive
        };
      }
    }

    if (!options.hasOwnProperty('buttonNextHTML') && !options.hasOwnProperty('buttonPrevHTML')) {
      options.buttonNextHTML = Drupal.theme('jCarouselButton', 'next');
      options.buttonPrevHTML = Drupal.theme('jCarouselButton', 'previous');
    }

    // Initialize the jcarousel.
    $carousel.addClass('jcarousel-processed').jcarousel(options);
  });
};

Drupal.jcarousel = {};
Drupal.jcarousel.reloadCallback = function(carousel) {
  // Set the clip and container to auto width so that they will fill
  // the available space.
  carousel.container.css('width', 'auto');
  carousel.clip.css('width', 'auto');
  var clipWidth = carousel.clip.width();
  var containerExtra = carousel.container.width() - carousel.clip.outerWidth(true);
  // Determine the width of an item.
  var itemWidth = carousel.list.find('li').first().outerWidth(true);
  var numItems = Math.floor(carousel.clip.width() / itemWidth) || 1;
  // Set the new scroll number.
  carousel.options.scroll = numItems;
  var newClipWidth = numItems * itemWidth;
  var newContainerWidth = newClipWidth + containerExtra;
  // Resize the clip and container.
  carousel.clip.width(newClipWidth);
  carousel.container.width(newContainerWidth);
};
Drupal.jcarousel.ajaxLoadCallback = function(jcarousel, state) {
  // Check if the requested items already exist.
  if (state == 'init' || jcarousel.has(jcarousel.first, jcarousel.last)) {
    return;
  }

  var $list = jcarousel.list;
  var $view = $list.parents('.view:first');
  var ajaxPath = Drupal.settings.jcarousel.ajaxPath;
  var target = $view.get(0);

  // Find this view's settings in the Views AJAX settings.
  var settings;
  $.each(Drupal.settings.jcarousel.carousels, function(domID, carouselSettings) {
    if ($list.is('.' + domID)) {
      settings = carouselSettings['view_options'];
    }
  });

  // Copied from ajax_view.js:
  var viewData = { 'js': 1, 'first': jcarousel.first - 1, 'last': jcarousel.last };
  // Construct an object using the settings defaults and then overriding
  // with data specific to the link.
  $.extend(
    viewData,
    settings
  );

  $.ajax({
    url: ajaxPath,
    type: 'GET',
    data: viewData,
    success: function(response) {
      Drupal.jcarousel.ajaxResponseCallback(jcarousel, target, response);
    },
    error: function(xhr) {
      Drupal.jcarousel.ajaxErrorCallback(xhr, ajaxPath);
    },
    dataType: 'json'
  });

};

/**
 * Init callback for jCarousel. Pauses the carousel when hovering over.
 */
Drupal.jcarousel.autoPauseCallback = function(carousel, state) {
  function pauseAuto() {
    carousel.stopAuto();
  }
  function resumeAuto() {
    carousel.startAuto();
  }
  carousel.clip.hover(pauseAuto, resumeAuto);
  carousel.buttonNext.hover(pauseAuto, resumeAuto);
  carousel.buttonPrev.hover(pauseAuto, resumeAuto);
};

/**
 * Setup callback for jCarousel. Calculates number of pages.
 */
Drupal.jcarousel.setupCarousel = function(carousel) {
  // Determine the number of pages this carousel includes.
  // This only works for a positive starting point. Also, .first is 1-based
  // while .last is a count, so we need to reset the .first number to be
  // 0-based to make the math work.
  carousel.pageSize = carousel.last - (carousel.first - 1);

  // jCarousel's Views integration sets "size" in the carousel options. Use that
  // if available, otherwise count the number of items in the carousel.
  var itemCount = carousel.options.size ? carousel.options.size : $(carousel.list).children('li').length;
  carousel.pageCount =  Math.ceil(itemCount / carousel.pageSize);
  carousel.pageNumber = 1;

  // Disable the previous/next arrows if there is only one page.
  if (carousel.options.wrap != 'circular' && carousel.pageCount == 1) {
    carousel.buttons(false, false);
  }

  // Always remove the hard-coded display: block from the navigation.
  carousel.buttonNext.css('display', '');
  carousel.buttonPrev.css('display', '');
}

/**
 * Setup callback for jCarousel. Adds the navigation to the carousel if enabled.
 */
Drupal.jcarousel.addNavigation = function(carousel, position) {
  // Don't add a pager if there's only one page of results.
  if (carousel.pageCount <= 1) {
    return;
  }

  // Add a class to the wrapper so it can adjust CSS.
  $(carousel.list).parents('.jcarousel-container:first').addClass('jcarousel-navigation-' + position);

  var navigation = $('<ul class="jcarousel-navigation"></ul>');

  for (var i = 1; i <= carousel.pageCount; i++) {
    var pagerItem = $(Drupal.theme('jCarouselPageLink', i));
    var listItem = $('<li></li>').attr('jcarousel-page', i).append(pagerItem);
    navigation.append(listItem);

    // Make the first page active by default.
    if (i === 1) {
      listItem.addClass('active');
    }

    // Scroll to the correct page when a pager is clicked.
    pagerItem.bind('click', function() {
      // We scroll to the new page based on item offsets. This works with
      // circular carousels that do not divide items evenly, making it so that
      // going back or forward in pages will not skip or repeat any items.
      var newPageNumber = $(this).parent().attr('jcarousel-page');
      var itemOffset = (newPageNumber - carousel.pageNumber) * carousel.pageSize;

      if (itemOffset) {
        carousel.scroll(carousel.first + itemOffset);
      }

      return false;
    });
  }

  $(carousel.list).parents('.jcarousel-clip:first')[position](navigation);
}

/**
 * itemVisibleInCallback for jCarousel. Update the navigation after page change.
 */
Drupal.jcarousel.updateNavigationActive = function(carousel, item, idx, state) {
  // The navigation doesn't even exist yet when this is called on init.
  var $listItems = $(carousel.list).parents('.jcarousel-container:first').find('.jcarousel-navigation li');
  if ($listItems.length == 0) {
    return;
  }

  // jCarousel does some very odd things with circular wraps. Items before the
  // first item are given negative numbers and items after the last are given
  // numbers beyond the total number of items. This complicated logic calculates
  // which page number is active based off this numbering scheme.
  var pageNumber = Math.ceil(idx / carousel.pageSize);
  if (pageNumber <= 0 || pageNumber > carousel.pageCount) {
    pageNumber = pageNumber % carousel.pageCount;
    pageNumber = pageNumber == 0 ? carousel.pageCount : pageNumber;
    pageNumber = pageNumber < 0 ? pageNumber + carousel.pageCount : pageNumber;
  }
  carousel.pageNumber = pageNumber;
  var currentPage = $listItems.get(carousel.pageNumber - 1);

  // Set the current page to be active.
  $listItems.not(currentPage).removeClass('active');
  $(currentPage).addClass('active');
}

/**
 * AJAX callback for all jCarousel-style views.
 */
Drupal.jcarousel.ajaxResponseCallback = function(jcarousel, target, response) {
  if (response.debug) {
    alert(response.debug);
  }

  var $view = $(target);
  var jcarousel = $view.find('ul.jcarousel').data('jcarousel');

  // Add items to the jCarousel.
  $('ul.jcarousel > li', response.display).each(function(i) {
    var itemNumber = this.className.replace(/.*?jcarousel-item-(\d+).*/, '$1');
    jcarousel.add(itemNumber, this.innerHTML);
  });

  // Add Drupal behaviors to the content of the carousel to affect new items.
  Drupal.attachBehaviors(jcarousel.list.get(0));

  // Treat messages the same way that Views typically handles messages.
  if (response.messages) {
    // Show any messages (but first remove old ones, if there are any).
    $view.find('.views-messages').remove().end().prepend(response.messages);
  }
};

/**
 * Display error messages using the same mechanism as Views module.
 */
Drupal.jcarousel.ajaxErrorCallback = function (xhr, path) {
  var error_text = '';

  if ((xhr.status == 500 && xhr.responseText) || xhr.status == 200) {
    error_text = xhr.responseText;

    // Replace all &lt; and &gt; by < and >
    error_text = error_text.replace("/&(lt|gt);/g", function (m, p) {
      return (p == "lt")? "<" : ">";
    });

    // Now, replace all html tags by empty spaces
    error_text = error_text.replace(/<("[^"]*"|'[^']*'|[^'">])*>/gi,"");

    // Fix end lines
    error_text = error_text.replace(/[\n]+\s+/g,"\n");
  }
  else if (xhr.status == 500) {
    error_text = xhr.status + ': ' + Drupal.t("Internal server error. Please see server or PHP logs for error information.");
  }
  else {
    error_text = xhr.status + ': ' + xhr.statusText;
  }

  alert(Drupal.t("An error occurred at @path.\n\nError Description: @error", {'@path': path, '@error': error_text}));
};

Drupal.theme.prototype.jCarouselButton = function(type) {
  // Use links for buttons for accessibility.
  return '<a href="javascript:void(0)"></a>';
};

Drupal.theme.prototype.jCarouselPageLink = function(pageNumber) {
  return '<a href="javascript:void(0)"><span>' + (pageNumber) + '</span></a>';
};

})(jQuery);
;
