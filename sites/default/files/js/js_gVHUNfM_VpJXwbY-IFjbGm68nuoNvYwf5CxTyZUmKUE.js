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

Drupal.Sweaver = Drupal.Sweaver || {};
Drupal.Sweaver.invokes = Drupal.Sweaver.invokes || {};

Drupal.Sweaver.messageTimer = null;
Drupal.Sweaver.changed = false;
Drupal.Sweaver.popup = '';

Drupal.Sweaver.writeCss = function(context) {

  var fullCss = '';
  $.each(Drupal.Sweaver.invokes, function(func) {
    var css = this.execute();
    if (css != '') {
      fullCss += css;
    }
  });
  $style = $('head style[title="sweaver"]');
  $style.remove();
  $('head').append('<style type="text/css" title="sweaver">' + fullCss + '</style>');
  $('[name=css-rendered]').val(fullCss);

  Drupal.Sweaver.changed = true;
};

$(document).ready(function() {

  // Avoid overlap with the localization client.
  if ($('#l10n-client').length > 0) {
    $('#sweaver').css({'bottom': $('#l10n-client .labels').height()});
  }

  // Gather open/close state and tab information
  Drupal.Sweaver.activeTab = Drupal.Sweaver.cookie('sweaver_active_tab') ? Drupal.Sweaver.cookie('sweaver_active_tab') : $('#sweaver-tabs .tab:first').attr('id');
  $('#' + Drupal.Sweaver.activeTab).addClass('active-tab');
  Drupal.Sweaver.cookie('sweaver_active_tab', Drupal.Sweaver.activeTab);
  Drupal.Sweaver.open = Drupal.Sweaver.cookie('sweaver_open') ? Drupal.Sweaver.cookie('sweaver_open') : 'true';
  Drupal.Sweaver.cookie('sweaver_open', Drupal.Sweaver.open);

  // Add sweaver class for extra margin at bottom.
  if (Drupal.Sweaver.open != 'false') {
    $('body').addClass('sweaver');
  }
  
  // Open/close the Sweaver bar.
  $('#sweaver-tabs .close a').click(function(){
    Drupal.Sweaver.toggleBar($(this).parent());
  });

  // Toggle the horizontal tabs.
  Drupal.Sweaver.container = Drupal.Sweaver.activeTab.substr(4, Drupal.Sweaver.activeTab.length - 4);
  $('#sweaver-tabs .tab a').click(function(){
    Drupal.Sweaver.toggleTabs($(this).parent());
  });

  // Print messages if any
  if ($('[name=sweaver-editor-messages]').val() != '') {
    Drupal.Sweaver.setMessage($('[name=sweaver-editor-messages]').val(), 5000);
  }

  // toggle vertical tabs
  $('#sweaver .vertical-tabs a').click(function(){
    if (!$(this).hasClass('active')) {
      // handle active classes.
      $('#sweaver #' + Drupal.Sweaver.container + ' .vertical-tabs .active').removeClass('active');
      $(this).addClass('active');
      var id = $(this).parent().attr('id').replace('tab-', '');
      $('#sweaver #' + Drupal.Sweaver.container + ' .vertical-content #container-' + id).siblings().hide();
      $('#sweaver #' + Drupal.Sweaver.container + ' .vertical-content #container-' + id).show();
    }
    return false;
  });

});

/**
 * Separate toggle bar function.
 */
Drupal.Sweaver.toggleBar = function (tab) {
  if (Drupal.Sweaver.open == 'false') {
    $('#sweaver-middle').css('height', 'auto');
    tab.removeClass('active-tab');
    $('#sweaver-tabs .close').removeClass('active-tab');
    $('#' + Drupal.Sweaver.activeTab).addClass('active-tab');
    Drupal.Sweaver.open = 'true';
  }
  else {
    $('#sweaver-middle').css("height", 0);
    $('#follow-link').hide();
    Drupal.Sweaver.activeTab =  $('#sweaver-tabs .active-tab').attr('id');
    tab.addClass('active-tab');
    $('#sweaver-tabs .close').addClass('active-tab');
    Drupal.Sweaver.open = 'false';
  }
  // Hide the extra margin at the bottom of the screen.
  $('body').toggleClass('sweaver');

  Drupal.Sweaver.toggleClicked();
  Drupal.Sweaver.cookie('sweaver_open', Drupal.Sweaver.open);
}

/**
 * Separate toggle tabs function.
 */
Drupal.Sweaver.toggleTabs = function (tab) {
  // Get the container that has to be shown.
  var container = tab.attr('id').replace('tab-', '');
  if (container != Drupal.Sweaver.container) {
    //Drupal.Sweaver.toggleBar(tab);
    if (Drupal.Sweaver.open == 'false') {
      $('#sweaver-middle').css("height", 'auto');
      Drupal.Sweaver.open = 'true';
      $('body').addClass('sweaver');
    }
    tab.siblings().removeClass('active-tab');
    tab.toggleClass('active-tab');
    $('#'+ container + ' > div').show();
    $('#'+ Drupal.Sweaver.container + ' > div').hide();
    Drupal.Sweaver.container = container;
  }
  else {
    Drupal.Sweaver.toggleBar(tab);
  }
  Drupal.Sweaver.activeTab =  tab.attr('id');
  Drupal.Sweaver.cookie('sweaver_open', Drupal.Sweaver.open);
  Drupal.Sweaver.cookie('sweaver_active_tab', Drupal.Sweaver.activeTab);
  Drupal.Sweaver.hidePopup();
  Drupal.Sweaver.toggleClicked();
};

/**
 * Separate switch tab function. Takes the tab as arguments and the ID's
 * of the containers will be derived from the tabs.
 */
Drupal.Sweaver.toggleClicked = function () {
  if (Drupal.Sweaver.open == 'true' && Drupal.Sweaver.activeTab == 'tab-sweaver_plugin_editor') {
    // Show the outline on all 'clicked' classes.
    $('.sweaver-clicked-temp').removeClass('sweaver-clicked-temp').addClass('sweaver-clicked');
  }
  else {
    // Hide the outline on all 'clicked' elements
    $('.sweaver-clicked').removeClass('sweaver-clicked').addClass('sweaver-clicked-temp');
  }
}

/**
 * Separate switch tab function. Takes the tab as arguments and the ID's
 * of the containers will be derived from the tabs.
 */
Drupal.Sweaver.switchTab = function (remove_tab, show_tab) {
  var container_remove = remove_tab.replace('tab-', '');
  var container_show = show_tab.replace('tab-', '');

  $('#'+ remove_tab).removeClass('active-tab');
  $('#'+ show_tab).toggleClass('active-tab');
  $('#'+ container_remove + ' > div').hide();
  $('#'+ container_show + ' > div').show();
  Drupal.Sweaver.container = container_show;

  Drupal.Sweaver.activeTab = show_tab;
  Drupal.Sweaver.cookie('sweaver_active_tab', show_tab);
  Drupal.Sweaver.hidePopup();
}

/**
 * Display Sweaver messages.
 */
Drupal.Sweaver.setMessage = function(message, timeout) {
  Drupal.Sweaver.setMessagePosition();
  $('#sweaver-messages .message').html(message);
  $('#sweaver-messages').fadeIn('fast');
  Drupal.Sweaver.messageTimer = window.setTimeout(function() {$('#sweaver-messages').fadeOut('normal');}, timeout);

  // Bind close messages.
  $('#sweaver-messages .close').click(function(){
    $('#sweaver-messages').hide();
    clearTimeout(Drupal.Sweaver.messageTimer);
  });

  // Bind resize on window.
  $(window).resize(function(event){
    Drupal.Sweaver.setMessagePosition();
  });
}

/**
 * Set the position of the message.
 */
Drupal.Sweaver.setMessagePosition = function(){
  messageTop = $(window).height() - $('#sweaver').outerHeight() - $('#sweaver-messages').outerHeight() - 7;
  $('#sweaver-messages').css({'top' : messageTop});
}

/**
 * Display a fullscreen popup.
 */
Drupal.Sweaver.showPopup = function(message, width, height) {
  // Close the previous popup - if any.
  if (Drupal.Sweaver.popup != '') {
    $(Drupal.Sweaver.popup).hide();
  }

  // Create popup.
  popup = $('#sweaver-popup');
  $(message).show();
  Drupal.Sweaver.popup = message;
  Drupal.Sweaver.setPopupSize(popup, width, height);
  popup.fadeIn('fast');

  // Bind close button action.
  $('.close', popup).click(function(){
    $(message).hide();
    Drupal.Sweaver.hidePopup();
  });

  // Bind resize on window if no width or height was given
  // and the popup is full screen.
  if (!width && !height) {
    $(window).bind('resize.Drupal.Sweaver', function(event){
      Drupal.Sweaver.setPopupSize(popup);
    });
  }
}

/**
 * Set the popup width and height.
 */
Drupal.Sweaver.setPopupSize = function(popup, width, height) {
  popupBorder = 7;
  // Reset overflow in case we don't need a scrollbar.
  $('.content', popup).css({'overflow-y' : 'hidden'});

  // Calculate width and height.
  var popupWidth = width ? width : $(window).width() - (popupBorder * 2) - parseInt(popup.css('padding-left')) - parseInt(popup.css('padding-right'));
  var popupHeight = height ? height : $(window).height() - $('#sweaver').outerHeight() - (popupBorder * 2) - parseInt(popup.css('padding-top')) - parseInt(popup.css('padding-bottom'));
  $('.content', popup).css({'height' : popupHeight, 'width' : popupWidth});

  // Center the popup in case a width or height was given.
  var popupLeft = width ? (($(window).width() - parseInt(popupWidth)) / 2) : popupBorder;
  var popupTop = height ? (($(window).height() - parseInt(popupHeight)) / 2) : popupBorder;
  popup.css({'left' : popupLeft + 'px', 'top' : popupTop + 'px'});

  // Add scrollbar if in fullscreen mode.
  if (!height) {
    $('.content', popup).css({'overflow-y' : 'scroll'});
  }
}

/**
 * Hide a popup.
 */
Drupal.Sweaver.hidePopup = function() {
  $('#sweaver-popup').hide();
  $(window).unbind('resize.Drupal.Sweaver');
}

/**
 * Set behaviors on link which will open the popup.
 */
Drupal.behaviors.sweaverOpenPopup = {
  attach: function (context) {
  $('#sweaver .popup-link a').click(function() {
      var wrapper = $(this).attr('id').replace('link', 'data');

      popup = $('#sweaver-popup');
      if (popup.is(':visible') && $(this).hasClass('open-tab')) {
        Drupal.Sweaver.hidePopup();
        $(this).removeClass('open-tab');
      }
      else {
        $('#sweaver .open-style-actions').removeClass('open-style-actions');
        $('#sweaver .open-tab').removeClass('open-tab');
        $(this).addClass('open-tab');
        Drupal.Sweaver.showPopup($('#'+ wrapper));
      }
      return false;
    });

    $('#sweaver .form-submit').click(function() {
      Drupal.Sweaver.hidePopup();
    });

    // Open a popup when clicking on an open/save/delete/publish link.
    $('#sweaver .style-actions-link a').click(function() {
      var wrapper = $(this).attr('id').replace('link', 'data');

      popup = $('#sweaver-popup');
      if (popup.is(':visible') && $(this).hasClass('open-style-actions')) {
        Drupal.Sweaver.hidePopup();
        $(this).removeClass('open-style-actions');
      }
      else {
        $('#sweaver .open-style-actions').removeClass('open-style-actions');
        $('#sweaver .open-tab').removeClass('open-tab');
        $(this).addClass('open-style-actions');
        Drupal.Sweaver.hidePopup();
        Drupal.Sweaver.showPopup($('#'+ wrapper), '400px', '200px');
      }
      return false;
    });
  }
};


/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

/**
 * Create a cookie with the given name and value and other optional parameters.
 *
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Set the value of a cookie.
 * @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
 * @desc Create a cookie with all available options.
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Create a session cookie.
 * @example $.cookie('the_cookie', null);
 * @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
 *       used when the cookie was set.
 *
 * @param String name The name of the cookie.
 * @param String value The value of the cookie.
 * @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
 * @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 * @type undefined
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */
Drupal.Sweaver.cookie = function(name, value, options) {
  if (typeof value != 'undefined') { // name and value given, set cookie
    options = options || {};
    if (value === null) {
      value = '';
      options.expires = -1;
    }
    var expires = '';
    if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
      var date;
      if (typeof options.expires == 'number') {
        date = new Date();
        date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
      }
      else {
        date = options.expires;
      }
      expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
    }
    // CAUTION: Needed to parenthesize options.path and options.domain
    // in the following expressions, otherwise they evaluate to undefined
    // in the packed version for some reason...
    var path = options.path ? '; path=' + (options.path) : '; path=/';
    var domain = options.domain ? '; domain=' + (options.domain) : '';
    var secure = options.secure ? '; secure' : '';
    document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
  }
  else { // only name given, get cookie
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
};

})(jQuery);;
// $Id: sweaver_plugin_editor.js,v 1.1.2.21.2.20 2010/11/08 16:01:24 jyve Exp $

/**
 * Add the sweaver bar at the bottom of the theme
 */

(function ($) {

Drupal.Sweaver = Drupal.Sweaver || {};

Drupal.Sweaver.types = new Array(); // A type groups different properties.
Drupal.Sweaver.properties = new Array(); // The actual css properties.
Drupal.Sweaver.selectors = new Array(); // The list of defined selector objects.
Drupal.Sweaver.css = new Object(); // Object with all targets and their properties.
Drupal.Sweaver.path = new Array(); // Full path to the root of the document.
Drupal.Sweaver.pathIndexes = new Array(); // An array with the indexes of all selected items.
Drupal.Sweaver.activePath = ''; // Currently active path including pseudo-classes.
Drupal.Sweaver.safeActivePath = ''; // Currently active path excluding pseudo-classes.
Drupal.Sweaver.activeElement = new Object(); // Currently active element.
Drupal.Sweaver.updateMode = true; // should the form updates be saved in css?

/**
 * Hook onload behavior
 */
$(document).ready(function() {

  Drupal.Sweaver.init();

  Drupal.Sweaver.writeCss();

  Drupal.Sweaver.changed = false;

  Drupal.Sweaver.addSliders();

  Drupal.Sweaver.addColorPicker();

  Drupal.Sweaver.updateForm();

  Drupal.Sweaver.bindClicks();
  
  Drupal.Sweaver.LoadPosition();
});

/**
 * Implements Drupal.Sweaver.invokes.processCSS().
 */
Drupal.Sweaver.invokes.editor = {
  execute: function (context, settings) {
    var css = '';
    var fullCss = '';
    var cssContent = '';

    for (var key in Drupal.Sweaver.css) {
      var target = Drupal.Sweaver.css[key];
      var contains_hidden_property = false;
      for (var prop in target) {
        if (Drupal.Sweaver.properties[prop]) {

          var properties = Drupal.Sweaver.properties[prop]['property'].split(' ');
          $.each(properties, function(i, property) {
            // Don't write anything if the value is empty.
            // 0 is not empty!
            if (target[prop]['value'] == '' && target[prop]['value'] != '0') {
              cssContent += '';
            }
            // Don't right anything if the property is hidden
            else if (target[prop]['hidden']) {
              cssContent += '';
              contains_hidden_property = true;
            }
            // Don't add a prefix and suffix for these exceptions.
            else if ((property == 'background-color' && target[prop]['value'] == 'transparent') || (property == 'background-image' && target[prop]['value'] == 'none')) {
              cssContent += '  ' + property + ': ' + target[prop]['value'] + ';\n';
            }
            else {
              cssContent += '  ' + property + ': ' + Drupal.Sweaver.properties[prop].prefix + target[prop]['value'] + Drupal.Sweaver.properties[prop].suffix + ';\n';
            }
          });
        }
      }

      if (cssContent != '' || contains_hidden_property) {
        css += key + '{\n';
        css += cssContent;
        css += '}\n';
        fullCss += css;
        css = '';
        cssContent = '';
      }
      // Remove key from Drupal.Sweaver.css
      else {
        delete Drupal.Sweaver.css[key];
      }
    }

    // Store css in hidden field in save form
    $("#sweaver [name=sweaver-css]").val($.toJSON(Drupal.Sweaver.css));

    // Add inline css
    $("#sweaver-form [name=sweaver-css]").val(fullCss);

    return fullCss;
  }
};

/**
 * Initialize member variables and properties.
 */
Drupal.Sweaver.init = function() {

  // Get previously stored information or create empty object with all targets
  db_css = $("[name=sweaver-css]");
  if (db_css.val() && db_css.val() != '[]'){
    Drupal.Sweaver.css = $.evalJSON(db_css.val());
    
    // Check if values are correctly set
    // If not they are converted in aim to correct depreciated behaviour
    for (key in Drupal.Sweaver.css){
      var target = Drupal.Sweaver.css[key];
      for (prop in target) {
        if (jQuery.type(target[prop]) != 'object'){
          Drupal.Sweaver.css[key][prop] = {
            'value' : Drupal.Sweaver.css[key][prop],
            'hidden' : false,
          };
        }  
      }
    }
    db_css.val('');
  }

  // Get Sweaver selectors.
  Drupal.Sweaver.selectors = Drupal.settings.sweaver['selectors'];

  // Get Sweaver types.
  Drupal.Sweaver.types = Drupal.settings.sweaver['types'];

  // Get Sweaver properties.
  Drupal.Sweaver.properties = Drupal.settings.sweaver['properties'];

  // Get classes that will never be used in the paths or generated css.
  Drupal.Sweaver.excludeClasses = Drupal.settings.sweaver['exclude_classes'];

  // Add a link popup to be able to follow links.
  $('body').append('<a href="#" id="follow-link">' + Drupal.t('Click here to follow this link') + '</a>');
}

/**
 * Get all css values and update the form
 */
Drupal.Sweaver.updateForm = function() {

  // Empty form values and hide unnecessary fields
  Drupal.Sweaver.initForm();

  // Prevent changes from being saved
  Drupal.Sweaver.updateMode = false;

  // Update form with saved settings
  if (Drupal.Sweaver.activePath != '') {
    if ($("#tab-sweaver_plugin_editor").hasClass('active-tab')) {
      $("#sweaver_plugin_editor #sweaver-editor").show();
    }
    var target = '';
    if (!isEmpty(Drupal.Sweaver.activeElement)) {
      var type = Drupal.Sweaver.activeElement.type;
      if (Drupal.Sweaver.types[type]) {
        $.each(Drupal.Sweaver.types[type], function (index, object){
          if (Drupal.Sweaver.properties[object]){
	          var properties = Drupal.Sweaver.properties[object]['property'].split(' ');
	          var tempValue = '';
	          var value = '';
	          $.each(properties, function(i, property) {
	            // Are there pseudo-classes in the active path? If so check the saved css for any values that have been set.
	            // We have do this since jQuery cannot get any values for selectors with pseudo-classes.
	            if (Drupal.Sweaver.safeActivePath != Drupal.Sweaver.activePath && Drupal.Sweaver.css[Drupal.Sweaver.activePath] && Drupal.Sweaver.css[Drupal.Sweaver.activePath][property]['value']) {
                value = Drupal.Sweaver.properties[property].prefix + Drupal.Sweaver.css[Drupal.Sweaver.activePath][property]['value'] + Drupal.Sweaver.properties[property].suffix;
              }
              else {
                value = $(Drupal.Sweaver.safeActivePath).css(property);
              }
	            if (tempValue == '') {
	              tempValue = value;
	            }
	            else {
	              if (tempValue != value) {
	                value = '';
	                return false;
	              }
	            }
	          });
	          if(value != '' && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'color') {
	            $('#' + object + ' .colorSelector div').css('cssText', 'background-color: ' + value + ' !important;');
	          }
	          else if (value && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'image') {
                // Remove the url() from around the image url.
	            // Mozilla browsers wrap in url(""), while webkit browsers wrap in url()
	            // so we need two replacements.
	            stripped = value.replace('url("', '').replace('")', '').replace('url(', '').replace(')', '');
                var container = $('#sweaver_plugin_editor #edit-' + object + '-ajax-wrapper .form-managed-file');
                if (1){
                if (stripped != 'none') {
                  container.children('input[type="file"]').hide();
                  container.children('span').remove();
                  
                  container.prepend('<span class="file"><a href="' + stripped + '" target="_blank">' + Drupal.t('Display image') + '</a></span>');

                  container.children('#edit-' + object + '-upload-button').val(Drupal.t('Remove'));
                  container.children('#edit-' + object + '-upload-button').attr('name', object + '_remove_button');
                  container.children('#edit-' + object + '-upload-button').attr('id', 'edit-' + object + '-remove-button');
                }
                else{
                  container.children('input[type="file"]').show();
                  container.children('span').remove();
                  container.children('input[name="' + object + '[fid]"]').val(0);

                  if(container.children('input[type="file"]').length == 0){
                    container.prepend('<input type="file" id="edit-' + object + '-upload" name="files[' + object + ']" size="22" class="form-file" style="display: inline-block; ">');
                  }
                  
                  container.children('#edit-' + object + '-remove-button').val(Drupal.t('Upload'));
                  container.children('#edit-' + object + '-remove-button').attr('name', object + '_upload_button');
                  container.children('#edit-' + object + '-remove-button').attr('id', 'edit-' + object + '-upload-button');
                }
                }
	            //$("#sweaver_plugin_editor #edit-" + object).val(stripped);
	          }
              else if (value && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'checkbox') // Implement the new field checkbox
              {
                if (Drupal.Sweaver.properties[object]['options'][value] == true)
                    $("#sweaver_plugin_editor #button-checkbox-" + object).addClass('button_active');
                else $("#sweaver_plugin_editor #button-checkbox-" + object).removeClass('button_active')
              }
              else if (value && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'radio') // Implement the new field radio
	          {
                $("#sweaver_plugin_editor div[id^=button-radio-" + object + "-]").removeClass('button_active');
                $("#sweaver_plugin_editor #button-radio-" + object + '-' + value).addClass('button_active');
	          }
              else {
	            if (value) {
                  if (value.substr(-1) == '%') {
                    // This value is in %
                    // We have to check if this is a correct for this field
                    // If not we will convert this value into px
                    if (!(value in Drupal.Sweaver.properties[object].options)) {
                      //Get first parent width
                      value = $(tempObject).parent().outerWidth() * value.replace('%', '') / 100;
                      value = Math.round(value);
                    }
                  }
                  // Make the sure it is a the string.
                  value = value + '';
	              $("#sweaver_plugin_editor #edit-" + object).val(value.replace('px', ''));
	            }
	          }
          }
        });
      }
    }
  }

  Drupal.Sweaver.updateMode = true;
}

/**
 * Empty form values and hide unnecessary fields.
 */
Drupal.Sweaver.initForm = function() {

  // Hide all sliders, all groups and all containers.
  Drupal.Sweaver.hideOverlays();
  $('#sweaver-editor .sweaver-group').hide();
  $('#sweaver-editor .container').hide();

  if (!isEmpty(Drupal.Sweaver.activeElement)) {
    // Decide which items should be shown or hidden.

    var type = Drupal.Sweaver.activeElement.type;
    $.each(Drupal.Sweaver.properties, function(index, object){
      if(object.name in Drupal.Sweaver.types[type]) {
        $('#sweaver .form-item-' + object.name).show();
        // From the moment that we have an visible element in a group, we need to show that group.
        $('#sweaver .form-item-' + object.name).parents('.sweaver-group').show();
        // From the moment that we have an visible element in a container, we need to show that container.
        $('#sweaver .form-item-' + object.name).parents('.container').show();
      }
      else {
        $('#sweaver .form-item-' + object.name).hide();
      }
    });
  }
}

/**
 * Show colorPicker and hook events to it
 */
Drupal.Sweaver.addColorPicker = function() {
  $('#sweaver .colorSelector').each(function() {
    var object = $(this);
    var property = object.parent().attr('id');
    object.ColorPicker({
      color: '#ffffff',
      // Determine the current color and send it to colorpicker.
      onBeforeShow: function () {
        var current_color_object = {};
        var current_color_value = ($('div', this).css('background-color')).replace('rgba(', '').replace('rgb(', '').replace(')', '').split(',');
        if (current_color_value[0] != 'transparent') {
          current_color_object.r = current_color_value[0];
          current_color_object.g = current_color_value[1];
          current_color_object.b = current_color_value[2];
          $(this).ColorPickerSetColor(current_color_object);
        }
        else {
          current_color_object.r = '255';
          current_color_object.g = '255';
          current_color_object.b = '255';
          $(this).ColorPickerSetColor(current_color_object);
        }
      },
      onShow: function (colpkr) {
        $(colpkr).fadeIn(500);
        if (object.parents('.sweaver-group-content').length == 0) {
          Drupal.Sweaver.hideOverlays();
        }
        return false;
      },
      onHide: function (colpkr) {
        $(colpkr).fadeOut(500);
        return false;
      },
      onChange: function (hsb, hex, rgb) {
      var preview = hex;
      if (hex != 'transparent') {
        preview = '#'+ hex;
      }
        $('div', object).css('cssText', 'background-color:' + preview + '!important;');
        if (Drupal.Sweaver.updateMode) {
          Drupal.Sweaver.setValue(property, hex);
        }
      }
    });
  });
}

/*
 * Add sliders through jQuery UI
 */
Drupal.Sweaver.addSliders = function() {
  $("#sweaver .slider-value").each(function() {
    $(this).after('<div class="slider-wrapper"><div id="' + $(this).attr('id').substr(5, $(this).attr('id').length - 5) + '-slider" class="slider"></div></div>');
  });

  // Move the slider to the right position on show.
  $("#sweaver .slider-value").click(function() {
    Drupal.Sweaver.updateMode = false;
    $(this).siblings('.slider-wrapper').children().slider("option", "value", $(this).val());
    Drupal.Sweaver.updateMode = true;
  });

  $("#sweaver .slider").each(function() {
    id = $(this).attr('id').replace('-slider', '');
    var minSlider = Drupal.Sweaver.properties[id].slider_min;
    if (minSlider == null || minSlider == '') {
      minSlider = 0;
    }
    var maxSlider = Drupal.Sweaver.properties[id].slider_max;
    if (maxSlider == null || maxSlider == '') {
      maxSlider = 2000;
    }
    $(this).slider({
      min: minSlider,
      max: maxSlider,
      slide: function(event, ui) {
        id = $(this).attr("id").replace('-slider','');
        $('#edit-' + id).val(ui.value);
        if (Drupal.Sweaver.updateMode) {
          Drupal.Sweaver.setValue(id, ui.value);
        }
      }
    });
  });
  
  //Double clicking on a slider delete all modifications made through the editor to the property
  $('#sweaver .slider a').bind('dblclick', function(){
    property = $(this).parent().attr('id').replace('-slider', '');
    Drupal.Sweaver.deleteProperty(Drupal.Sweaver.activePath, property);
  });
}

/**
 * Loop through all clickable area's and bind click
 */
Drupal.Sweaver.bindClicks = function() {

  // Get a list of selectors to exclude.
  var excludes = Drupal.settings.sweaver['exclude_selectors'];

  // Add hover outline object.
  $('#sweaver-frontend').append('<div style="position: absolute; top: 0; left: 0; border: 2px dotted #ccc" id="#sweaver-hover"></div>');

  // Build an object with all the elements that can be hovered/clicked
  var tempSelectors = $('body').find('*').filter(':parents(' + excludes + '):not(' + excludes + ')');

  // When an element is hovered, add a class 'sweaver-hovered'.
  if (Drupal.settings.sweaver['preview_selector']) {
    tempSelectors
    .bind('mouseenter', function(event){
      // Only do something when the content area is visible.
      if (Drupal.Sweaver.visible()) {
        tempObject = $(this);
        object = Drupal.Sweaver.buildSweaverObject(tempObject);
        // Loop through the selectors to see if the current item should be selectable.
        if (!object.translation[0]) {
          $.each(tempObject.parents(), function() {
            tempObject = $(this);
            object = Drupal.Sweaver.buildSweaverObject(tempObject);
            if (object.translation[0]) {
              return false;
            }
          });
        }
        // Make sure only one item has the outline.
        $('.sweaver-hovered').removeClass('sweaver-hovered');

        // Don't add the class on elements that cover the entire screen
        // since that would add a, annoying horizontal scrollbar.
        
        // There is actually a bug reguarding WebKit and outerHeight/outerWidth property
        // In aim to make it work we have to shortly change the display to inline-block
        var originalDisplay = tempObject.css('display');
        tempObject.css('display', 'inline-block');
        if (tempObject.outerWidth() != $(window).width()) {
          tempObject.addClass('sweaver-hovered');
        }
        tempObject.css('display', originalDisplay);
      }
    })
    .bind('mouseleave', function(event){
      // Loop through the selectors to see if the current item should be selectable.
      if (Drupal.Sweaver.visible()) {
        tempObject = $(this);
        tempObject.removeClass('sweaver-hovered');

        $.each(tempObject.parents(), function() {
          tempObject = $(this);
          object = Drupal.Sweaver.buildSweaverObject(tempObject);
          if (object.translation[0]) {
            return false;
          }
        });
        var originalDisplay = tempObject.css('display');
        tempObject.css('display', 'inline-block');
        if (tempObject.outerWidth() != $(window).width()) {
          tempObject.addClass('sweaver-hovered');
        }
        tempObject.css('display', originalDisplay);
      }
    });
  }

  // When an element is clicked, add a class and build the entire path.
  tempSelectors
  .bind('click', function (event) {
    // Only do something when the content area is visible.
    if (Drupal.Sweaver.visible()) {

      // We need to use event.target here as we need to know if we clicked on an element that should be excluded.
      // If we don't do this, then we will get the parent element of the excluded element, which is not what we want.
      tempObject = $(event.target);
      
      Drupal.Sweaver.editSelection(tempObject, event);
    }
  });

  // Hide sliders and close groups when clicking outside of them.
  $("#sweaver").click(function() {
    Drupal.Sweaver.hideOverlays();
  });

  // Update css when a fake checkbox is clicked
  $("#sweaver_plugin_editor div[id^=button-checkbox-]").click(function(){
    if ($(this).hasClass('button_active'))
      $(this).removeClass('button_active');
    else $(this).addClass('button_active');
    
    if (Drupal.Sweaver.updateMode) {
      var status = $(this).hasClass('button_active');
      var property_to_update = $(this).attr('id').replace('button-checkbox-', '');
        
      $.each(Drupal.Sweaver.properties[property_to_update]['options'], function(key, value) { 
        if (value == status)
          Drupal.Sweaver.setValue(property_to_update, key);
      });
    }
  });
  
  // Update css when a fake radio button is clicked
  $("#sweaver_plugin_editor div[id^=button-radio-]").click(function(){
    var property_to_update = $(this).attr('name');
    var value = $(this).attr('id').replace('button-radio-' + property_to_update + '-', '');
    $("#sweaver_plugin_editor div[id^=button-radio-" + property_to_update + "-]").removeClass('button_active');
    $(this).addClass('button_active');
    
    if (Drupal.Sweaver.updateMode) {
        Drupal.Sweaver.setValue(property_to_update, value);
    }
  });
  
  //Double clicking on a radio button delete all modifications made through the editor to the property
  $("#sweaver_plugin_editor div[id^=button-radio-]").bind('dblclick', function(){
    property = $(this).attr('name');
    Drupal.Sweaver.deleteProperty(Drupal.Sweaver.activePath, property);
  });

  // Update css when something (that is not checkbox or radio button) is changed in the form.
  $("#sweaver_plugin_editor input[id^=edit-], #sweaver_plugin_editor select[id^=edit-]").live('change', function(){
    if (Drupal.Sweaver.updateMode) {
      // Is this a file input ?
      if ($(this).attr('name').match('^files\[[a-zA-Z0-9_-]+\]')){
        var name = $(this).attr('name').substr(6, $(this).attr('name').length - 7);
        var button = $('#' + $(this).attr('id') + '-button');
        button.trigger('click');
        button.trigger('mousedown');    
          
        // this function check every second if the image selected has been uploaded
        (function imageValueChecker (i) {  
          var fidInput = $('#sweaver_plugin_editor input[name="' + name + '[fid]"]');
          setTimeout(function () {  
          if (fidInput.val() != 0 ){
          // Download complete
          // We proceed of the css update
            $('#edit-' + name + '-ajax-wrapper').ajaxSuccess(function(evt, request, settings){
              window.location.reload();
            });
            absolute_path = fidInput.siblings('.file').children('a').attr('href');
            relative_path = absolute_path.replace(Drupal.settings.sweaver['base_root'], '');
            Drupal.Sweaver.setValue(name ,relative_path);
            Drupal.Sweaver.SavePosition();
            Drupal.Sweaver.AutoSave();
          }               
          if (fidInput.val() == 0 && --i) imageValueChecker(i);      //  decrement i and call myLoop again if i > 0
          }, 1000);
        })(15); // If 15 seconds after the beginning of the upload it is not yet finished we can assume that there has been a problem.
      }
      else {
        Drupal.Sweaver.setValue($(this).attr('name'), $(this).val());
      }
    }
  });
  
  $('#sweaver_plugin_editor .form-managed-file input[type=submit]').live('mouseover', function(){
    if(!$(this).hasClass('event_added')){
      $(this).addClass('event_added');
      $(this).bind('mousedown', function(){
        Drupal.Sweaver.setValue($(this).attr('name').replace('_remove_button', ''), 'none');
      });
    }
  });
  
  // Show the slider when a numeric value is entered.
  $("#sweaver_plugin_editor  .slider-value").click(function(event){
    event.stopPropagation();
    $slider = $(this).siblings('.slider-wrapper');

    if ($slider.css('visibility') == 'visible') {
      // Add an active class for IE position issues.
      $slider.parent().removeClass('active');
      $slider.parents('.sweaver-group').removeClass('active');

      // Close slider again on second click.
      $slider.css({'visibility' : 'hidden'});
    }
    else {
      // Hide all other sliders.
      $('#sweaver_plugin_editor .slider-wrapper').css({'visibility' : 'hidden'});

      // Add an active class for IE position issues.
      $('#sweaver_plugin_editor .form-item, #sweaver_plugin_editor .sweaver-group').removeClass('active');
      $slider.parent().addClass('active');
      $slider.parents('.sweaver-group').addClass('active');
      
      var container = $(this).parent().parent();      
      var top =  $slider.outerHeight();
      var left = -($slider.width() / 2) + ($(this).outerWidth() / 2);
      
      if ($slider.siblings('label').is(':visible')) {
        left += $slider.siblings('label').width();
      }
      else if (container.hasClass('side')) {
        left += $(this).offset().left - container.offset().left;      
      }
      
      // Flip the slider over the input when it is too close to the bottom of the page to be displayed
      if ($('#sweaver').offset().top + $('#sweaver').height() - $(this).offset().top < 100) {
        top = 0 - top - 5;
      }  
      
      $slider.css({'left' : left, 'top' : top}).css({'visibility' : 'visible'});
    }
  });
  
  // The value of an input field can be modified with arrows
  $("#sweaver_plugin_editor  .slider-value").keydown(function(event){
    var value = $(this).val();
    switch(event.keyCode) {
      case 37:
      case 40:
        value--;
        $(this).val(value);
        Drupal.Sweaver.setValue($(this).attr('name'), value);
        break;
      
      case 38:
      case 39:
        value++;
        $(this).val(value);
        Drupal.Sweaver.setValue($(this).attr('name'), value);
        break;
    }
  });

}

/**
 * Load an object to the editor from a selector
 */
Drupal.Sweaver.editSelection = function (tempObject, event) {
  clicked_object = (event == null) ? false : true;
  if (!tempObject.parents(Drupal.settings.sweaver['exclude_selectors']).length > 0) {
    if (clicked_object) {
      event.stopPropagation();
    }

    object = Drupal.Sweaver.buildSweaverObject(tempObject);
    
    // If the clicked object is a link, or an element in a link, prevent default behavior.
    $('#follow-link').hide();
    if (object.tag == 'a' || tempObject.parents('a').length > 0) {
      var position = tempObject.offset();
      var clickObject = tempObject;
      if (object.tag != 'a') {
        clickObject = tempObject.parents('a');
      }
      if (object.id != 'follow-link') {
        $('#follow-link').attr('href', clickObject.attr('href')).css({
          'top': position.top + clickObject.outerHeight() + 5,
          'left': position.left
        }).fadeIn();
        if (clicked_object) {
          event.preventDefault();
        }
      }
    }
    // If the clicked object is a button prevent default behavior.
    if ((object.tag == 'input' || object.tag == 'label') && clicked_object) {
      event.preventDefault();
    }

    // Don't do anything if the clicked object is the 'follow-link' link.
    if (object.id != 'follow-link') {

      // Only do something if the clicked item is found in the selectors.
      if (!object.translation[0]) {
        $.each(tempObject.parents(), function () {
          tempObject = $(this);
          object = Drupal.Sweaver.buildSweaverObject(tempObject);
          if (object.translation[0]) {
            return false;
          }
        });
      }
      
      // Prevent from selecting non modifiable selectors
      if (!object.translation[0]) {
        return false;
      }

      // clear the old paths.
      $('#sweaver_plugin_editor .sweaver-header').html('<div id="full-path" class="clearfix"></div><div id="selected-path" class="clear-block"></div>');

      // Reset some values.
      Drupal.Sweaver.path.length = 0;
      Drupal.Sweaver.pathIndexes.length = 0;
      $("#selected-path").html('<span class="path-label">' + Drupal.t('Selected item: ') + '</span><span class="path-content"></span>');
      $("#full-path").html('<span class="path-label">' + Drupal.t('Full path: ') + '</span><span class="path-content"></span>');

      // Build path with parents.
      Drupal.Sweaver.buildPath(tempObject);
      Drupal.Sweaver.updateForm();
      Drupal.Sweaver.updateScreen();
    }
  }
}

/**
 * Loop through all clickable area's and bind click
 */
Drupal.Sweaver.updateScreen = function() {
  if (Drupal.settings.sweaver['preview_selector']) {
    // Add border around selected element.
    var excludes = Drupal.settings.sweaver['exclude_selectors'];
    $('.sweaver-clicked').removeClass('sweaver-clicked');
    if (Drupal.Sweaver.safeActivePath && $(Drupal.Sweaver.safeActivePath).outerWidth() != $(window).width()) {
      $(Drupal.Sweaver.safeActivePath).filter(':parents(' + excludes + '):not(' + excludes + ')').addClass('sweaver-clicked');
    }
    else {
      // Hide the 'clicked' outlines.
      $('.sweaver-clicked').removeClass('sweaver-clicked');
    }
  }
}

/**
 * Store the parents of a clicked item.
 */
Drupal.Sweaver.buildPath = function(object) {
  var index = 0;

  // Collect info on currently active item.
  Drupal.Sweaver.activeElement = Drupal.Sweaver.buildSweaverObject(object);

  // Add active element to first element in the path array.
  Drupal.Sweaver.path[0] = Drupal.Sweaver.activeElement;

  // Show the currenty active path and the full path.
  Drupal.Sweaver.addToFullPath(index, true);
  Drupal.Sweaver.addToActivePathIndex(0);

  // Traverse all parents and save them in the path array.
  var i = 1;
  var active;
  object.parents().each(function() {

    active = false;
    var parent = Drupal.Sweaver.buildSweaverObject($(this));
    if (parent.translation[0]) {
      Drupal.Sweaver.path[i] = parent;

      // If selector is tagged as 'highlight', automatically select it.
      var match = '';
      $.each(Drupal.Sweaver.selectors, function (index, selector) {
        if (selector.selector == 'sweaver_all_ids' || selector.selector == 'sweaver_all_classes' || selector.selector == 'sweaver_all_tags') {
          return false;
        }
        if (selector.selector == '#' + parent.id || selector.selector == parent.tag) {
          match = selector.selector;
          if (selector.highlight == '1') {
            active = true;
            Drupal.Sweaver.addToActivePathIndex(i);
          }
        } else {
          $.each(parent.classes, function(index, aClass) {
            if (selector.selector == '.' + aClass) {
              match = selector.selector;
              if (selector.highlight == '1') {
                active = true;
                Drupal.Sweaver.addToActivePathIndex(i);
                return false;
              }
            }
          });
        }
        if (match != '') {
         return false;
        }
      });

      // Add all items to the full path except for the html tag.
      if (parent.tag != 'html') {
        Drupal.Sweaver.addToFullPath(i, active);
      }
      i++;
    }
  });
  if (i > 2) // There are always at least 2 levels
  {
    if (!(1 in Drupal.Sweaver.pathIndexes)) {
      Drupal.Sweaver.addToActivePathIndex(1);
      $('#sweaver #full-path #sid-1').addClass('active');
    }
  }
  Drupal.Sweaver.printActivePath();
}

/**
 * Add one item to the full path.
 */
Drupal.Sweaver.addToFullPath = function(index, active) {
  var path_separator = '&nbsp;&gt;&nbsp;';
  var active_class = '';

  // Don't show a seperator after the last item in the path.
  if (index == 0) {
    path_separator = '';
  }

  // Add an active class to the selected items.
  if (active == true) {
    active_class = ' active';
  }

  // Get the list of translated selectors.
  var selectorList = Drupal.Sweaver.path[index].translation;

  // First add the default selector.
  $("#full-path .path-content").prepend('<div class="selector-wrapper' + active_class + '" id="sid-' + index + '"><div class="first-selector"><a title="' + Drupal.t('Click to add this element to the selected path') + '">' + selectorList[0] + '</a></div><div class="selector-separator">' + path_separator + '</div></div>');

  // Next add a popup with all possible selectors.
  var selectors = ''
  for (var i=1; i < selectorList.length; i++) {
    tempClass = '';
    // Add a class active to indicate the preferred selector.
    if (i == 1) {
      tempClass += 'active ';
    }
    if (i == 1) {
      tempClass += 'first ';
    }
    if (i == selectorList.length - 1) {
      tempClass += 'last';
    }
    selectors += '<li class="' + tempClass + '"><a href="#" id="ssid-' + (i-1) + '">' + selectorList[i] + '</a></li>';
  }

  // Finally, add some pseudo-classes.
  var pseudoClasses = '';
  if (Drupal.Sweaver.path[index].tag == 'a') {
    pseudoClasses += '<li class="first"><a href="#">:hover</a></li>';
    pseudoClasses += '<li><a href="#">:visited</a></li>';
    pseudoClasses += '<li><a href="#">:active</a></li>';
    pseudoClasses += '<li class="last"><a href="#" >:link</a></li>';
  }
  else {
    pseudoClasses += '<li class="first last"><a href="#" class="hover">:hover</a></li>';
  }

  $("#sid-" + index).prepend('<div class="selector-popup-opener">open</div><div class="selector-popup"><ul class="selectors">' + selectors + '</ul><ul class="pseudoclasses">' + pseudoClasses + '</ul></div>');

  // Bind click to change the active path.
  $('#sid-' + index + ' .first-selector a').click(function() {
    $(this).parent().parent().toggleClass('active');
    Drupal.Sweaver.addToActivePathIndex(index);
    Drupal.Sweaver.printActivePath();
    // Reset the active element as it might have changed.
    Drupal.Sweaver.pathIndexes.sort(function(a,b){return a - b});
    Drupal.Sweaver.activeElement = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] : {} ;
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();

    // Stop the link from doing anything.
    return false;
  });

  // Change the active path from a popup.
  $('#sid-' + index + ' .selector-popup ul.selectors a').click(function() {
    // Store in the active object that there is a new preferred selector instead of the first one defined in the backend.
    var $link = $(this);
    var i = $link.attr('id').substr(5);
    Drupal.Sweaver.path[index].preferredSelector = i;
    Drupal.Sweaver.printActivePath();
    // Replace the selector in the full path.
    $('#sid-' + index + ' .first-selector a').html(Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[index])[0]);
    // Add an active class.
    $link.parents('.selector-popup').css({'left' : '-10000px'}).parent().removeClass('open');
    $link.parent().siblings('.active').removeClass('active');
    $link.parent().addClass('active');
    // Update the form.
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();
    return false;
  });

  // Add a pseudo-class from a popup.
  $('#sid-' + index + ' .selector-popup ul.pseudoclasses a').click(function() {
    var $link = $(this);
    // If the link was already active, deactivate it otherwhise add the active class.
    if (!$link.parent().hasClass('active')) {
	    // Add the pseudo-class to the object in question.
	    Drupal.Sweaver.path[index].pseudoClass = $(this).text();
	    // Update the translation of the object in question.
	    Drupal.Sweaver.path[index].translation = Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[index]);
	    // Update the active path.
	    Drupal.Sweaver.printActivePath();
	    // Change the text in the full path.
	    $('#sid-' + index + ' .first-selector a').html(Drupal.Sweaver.path[index].translation[0]);
	    // Handle all active classes.
	    $link.parent().siblings('.active').removeClass('active');
	    $link.parent().addClass('active');
    }
    else {
      Drupal.Sweaver.path[index].pseudoClass = '';
      // Update the translation of the object in question.
      Drupal.Sweaver.path[index].translation = Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[index]);
      // Update the active path.
      Drupal.Sweaver.printActivePath();
      // Change the text in the full path.
      $('#sid-' + index + ' .first-selector a').html(Drupal.Sweaver.path[index].translation[0]);
      // Handle all active classes.
      $link.parent().removeClass('active');
	  }
    // Close the popup.
		$link.parents('.selector-popup').css({'left' : '-10000px'}).parent().removeClass('open');
    // Update the form with the new path.
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();
    return false;
  });

  // Hide/show selector popups.
  $('#sid-' + index + ' .selector-popup-opener').click(function() {
    var $popup = $(this).siblings('.selector-popup');
    $this = $(this);
    if ($this.parent().hasClass('open')) {
      $this.parent().removeClass('open');
      $popup.css({'left' : '-10000px'});
    }
    else {
      // Hide other open selector popups.
      $('#sweaver .selector-wrapper.open .selector-popup').css({'left' : '-10000px'});
      $this.parent().addClass('open');
      $this.parent().siblings().removeClass('open');
	    // Calculate the right width.
	    var width = 0;
	    $($popup.children('ul')).each(function() {
	     width += $(this).outerWidth();
	    });
      $popup.css({'width' : width});
      // See if the popup should be opened on the left or the right.
      var offset = $this.offset();
      var left = (offset.left + width) > $(window).width() ? - $popup.outerWidth() :  $this.outerWidth();
      $popup.hide().css({'left' : left});
      // Show the popup.
      $popup.slideDown('fast');
    }
  });
}

/**
 * Add an item to the active path index.
 * This way we can keep track of the selected items in the ful path.
 */
Drupal.Sweaver.addToActivePathIndex = function(i) {
  // Do not add the item when selected or remove it from Active path.
  var position = $.inArray(i, Drupal.Sweaver.pathIndexes);
  if (position < 0) {
    Drupal.Sweaver.pathIndexes.unshift(i);
  }
  else {
    // Remove from pathIndexes if necessary.
    for (var key in Drupal.Sweaver.pathIndexes) {
      if (Drupal.Sweaver.pathIndexes[key] == i) {
        Drupal.Sweaver.pathIndexes.splice(key, 1);
      }
    }
  }
}

/**
 * Print the active path.
 */
Drupal.Sweaver.printActivePath = function() {
  // Reset the previous path and add the next item to pathIndexes.
  $path = $("#selected-path .path-content");
  $path.html('');
  Drupal.Sweaver.activePath = '';
  // Since jquery cannot get a css value when a pseudo-class is in it, we have to create a version
  // of the active patch without the pseudo-classes.
  Drupal.Sweaver.safeActivePath = '';

  // Sort pathIndexes.
  Drupal.Sweaver.pathIndexes.sort(function(a,b){return a - b});

  // Print the selected path in human-readable language.

  if (Drupal.Sweaver.pathIndexes.length > 0) {
    for ( var i=0, len=Drupal.Sweaver.pathIndexes.length; i<len; ++i ){
      if (i > 0) {
        $path.append(' in ');
      }
      // See which translation should be used.
      var j = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector : 0;
      j++;
      $path.append(Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].translation[j]);
    }
    // Save the currently active css path.
    Drupal.Sweaver.pathIndexes.reverse();
    for (var i=0, len=Drupal.Sweaver.pathIndexes.length; i<len; ++i){
      // See which translation should be used.
      var j = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector : 0;
      j++;
      Drupal.Sweaver.activePath += Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].css[j] + Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].pseudoClass + ' ';
      Drupal.Sweaver.safeActivePath += Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].css[j] + ' ';
    }
  }
  else {
    $path.html(Drupal.t('none'));
  }
}

/**
 * Fill the activeElement and update the Form and ActivePath.
 * Other plugins can use this function to set values on the
 * style tab. To switch tabs, you can use the Drupal.Sweaver.switchTab
 * function.
 */
Drupal.Sweaver.updateStyleTab = function(theClass, name) {
  // Build the object with manipulated data.
  var tempObject = Drupal.Sweaver.buildSweaverObject($('.' + theClass));

  tempObject.translation = new Array(name, name);
  tempObject.classes = new Array('.' + theClass);
  tempObject.css = new Array('.' + theClass, '.' + theClass);

  Drupal.Sweaver.activeElement = tempObject;

  // Build path with parents.
  $('#sweaver_plugin_editor .sweaver-header').html('<div id="selected-path" class="clearfix"></div>');
  Drupal.Sweaver.path[0] = new Object({'id' : Drupal.Sweaver.activeElement.id, 'class' : Drupal.Sweaver.activeElement.classes, 'pseudoClass' : '', 'tag' : Drupal.Sweaver.activeElement.tag,  'type' : Drupal.Sweaver.activeElement.type, 'translation' : Drupal.Sweaver.activeElement.translation, 'css' : Drupal.Sweaver.activeElement.css});
  Drupal.Sweaver.addToFullPath(0, true);
  Drupal.Sweaver.pathIndexes = new Array();
  Drupal.Sweaver.addToActivePathIndex(0);
  Drupal.Sweaver.printActivePath();
  Drupal.Sweaver.activePath = '.' + theClass;
  Drupal.Sweaver.updateForm();
  Drupal.Sweaver.updateScreen();
}

/**
 * Store new value and update inline css.
 */
Drupal.Sweaver.setValue = function(property, value) {
  Drupal.Sweaver.css[Drupal.Sweaver.activePath] = Drupal.Sweaver.css[Drupal.Sweaver.activePath] || {};
  Drupal.Sweaver.css[Drupal.Sweaver.activePath][property] = {
    'value' : value,
    'hidden' : false,
  };
  Drupal.Sweaver.writeCss();
}

/**
 * Delete a property from a selector.
 */
Drupal.Sweaver.deleteProperty = function(key, property) {
  var target = Drupal.Sweaver.css[key];
  Drupal.Sweaver.css[key] = {};
  for (var prop in target) {
    if (prop != property) {
      Drupal.Sweaver.css[key][prop] = target[prop];
    }
  }
  Drupal.Sweaver.writeCss();
  Drupal.Sweaver.updateForm();
}

/**
 * Translate an parent item in a human-readable name.
 */
Drupal.Sweaver.objectToReadable = function(object) {

  var translation = new Array();
  var id_translation = new Array();
  var class_translation = new Array();
  var tag_translation = new Array();

  var css = new Array();
  var id_css = new Array();
  var class_css = new Array();
  var tag_css = new Array();

  var selector = '';
  var description = '';
  var tempSelectors = new Array();
  var pseudoClass = object.pseudoClass ? object.pseudoClass : '';

  var i = 0;

  // Traverse all selectors defined in the backend and return an array with the description.
  $.each(Drupal.Sweaver.selectors, function() {
    selector = this.selector;
    name = this.name;
    description = this.description;

    if (name == 'allids') {
      if (object.id && $.inArray('#' + object.id, tempSelectors) < 0) {
        id_translation[i] = 'the ' + object.id + ' region';
        id_css[i] = '#' + object.id;
        tempSelectors.push('#' + object.id);
        i++;
      }
    }
    else if (name == 'allclasses') {
      if (object.classes && object.classes[0]) {
        $.each(object.classes, function(index, tempClass) {
          if ($.inArray(tempClass, Drupal.Sweaver.excludeClasses) < 0 && $.inArray('.' + tempClass, tempSelectors) < 0) {
            class_translation[i] = 'all ' + tempClass;
            class_css[i] = '.' + tempClass;
            tempSelectors.push('.' + tempClass);
            i++;
          }
        });
      }
    }
    else if (name == 'alltags' && $.inArray(object.tag, tempSelectors) < 0) {
      tag_translation[i] = object.tag;
      tag_css[i] = object.tag;
      tempSelectors.push(object.tag);
      i++;
    }
    else {
      if (selector == '#' + object.id && $.inArray('#' + object.id, tempSelectors) < 0) {
        id_translation[i] = description;
        id_css[i] = '#' + object.id;
        tempSelectors.push('#' + object.id);
        i++;
      } else if (selector == object.tag && $.inArray(object.tag, tempSelectors) < 0) {
        tag_translation[i] = description;
        tag_css[i] = object.tag;
        tempSelectors.push(object.tag);
        i++;
      } else {
        $.each(object.classes, function(index, tempClass) {
          if (selector == '.' + tempClass  && $.inArray(tempClass, Drupal.Sweaver.excludeClasses) < 0 && $.inArray('.' + tempClass, tempSelectors) < 0) {
            class_translation[i] = description;
            class_css[i] = '.' + tempClass;
            tempSelectors.push('.' + tempClass);
            i++;
          }
        });
      }
    }
  });

  // Merge the translation arrays.
  for (var j = 0; j < i; j++) {
    var k = id_translation[j] ? id_translation[j] : class_translation[j] ? class_translation[j] : tag_translation[j];
    translation[j] = Drupal.Sweaver.addPseudoClass(pseudoClass, k);
  }

  // Merge the css arrays.
  for (var j = 0; j < i; j++) {
    var k = id_css[j] ? id_css[j] : class_css[j] ? class_css[j] : tag_css[j];
    css[j] = k;
  }

  // Add combinations of classes, ids and tags.
  if (Drupal.settings.sweaver['combined_selectors']) {
	  t = i;
	  if (tag_translation.length > 0) {
	    $.each(tag_translation, function(index, tag) {
	      if (tag) {
			    $.each(id_translation, function(index, trans) {
			      if (trans) {
			        translation[t] = Drupal.Sweaver.addPseudoClass(pseudoClass, tag + ' + ' + trans);
			        css[t] = object.tag + id_css[index];
			        t++;
			      }
			    });
		      $.each(class_translation, function(index, trans) {
		        if (trans) {
		          translation[t] = Drupal.Sweaver.addPseudoClass(pseudoClass, tag + ' + ' + trans);
              css[t] = object.tag + class_css[index];
		          t++;
		        }
		      });
		    }
		  });
	  }
  }

  // If a prefered selector was set in the object, return that one instead of the default first one.
  index = object.preferredSelector ? object.preferredSelector : 0;
  translation.splice(0, 0, translation[index]);
  css.splice(0, 0, css[index]);

  object.translation = Drupal.settings.sweaver['translate_path'] ? translation : css;
  object.css = css;
  return translation;
}

/**
 * Add a pseudo class to the translation.
 */
Drupal.Sweaver.addPseudoClass = function(pseudoClass, original) {
  if (Drupal.settings.sweaver['translate_path']) {
    var translation = pseudoClass ? original + Drupal.t(' in the ' + pseudoClass + ' state') : original;
  }
  else {
    var translation = pseudoClass ? original + pseudoClass : original;
  }
  return translation;
}

/**
 * Save current position
 */
Drupal.Sweaver.SavePosition = function() {
  // Store the object used
  // First we need to construct this path
  path = '';
  Drupal.Sweaver.path.reverse();
  $.each(Drupal.Sweaver.path, function(index, value){
    $.each(value.classes, function(i, v){
      if (v == 'sweaver-hovered' || v == 'sweaver-clicked') {
        value.classes.splice(i);
      }
    })
    
    if (value.tag == 'html' || value.tag == 'body') {
      path += ' ' + value.tag;
    }
    else if (value.id != '') {
      path += ' #' + value.id;
    }
    else if (Object.keys( value.classes ).length !== 0 && value.classes[0] != ''){
      path += ' .' + value.classes[0];
    }
    else {
      path += ' ' + value.tag;
    }
  });
  Drupal.Sweaver.path.reverse();
  Drupal.Sweaver.cookie('sweaver_active_path', path);
  
  // Save indexed path
  indexed_path = '';
  $('#sweaver_plugin_editor #full-path div[id^=sid-].active').each(function(){
    id = $(this).attr('id').substr(4);
    $(this).find('li.active').each(function(){
      if ($(this).children().attr('id') != '') {
        sub_id = $(this).children().attr('id').substr(5);
      }
      else {
        sub_id = $(this).children().attr('class');
      }
      indexed_path += ' ' + id + '-' + sub_id;
    });
  });
  Drupal.Sweaver.cookie('sweaver_indexed_path', indexed_path);
  
  // Store the tab used
  Drupal.Sweaver.cookie('sweaver_active_vertical_tab', $('#sweaver_plugin_editor #sweaver-editor .vertical-tabs a.active').parent().attr('id'));
}

/**
 * Load a saved position in the editor (active path and tab)
 */
Drupal.Sweaver.LoadPosition = function() {
  active_path = Drupal.Sweaver.cookie('sweaver_active_path');
  indexed_path = Drupal.Sweaver.cookie('sweaver_indexed_path');
  vertical_tab = Drupal.Sweaver.cookie('sweaver_active_vertical_tab');
  
  // If a configuration has been saved lets load it
  if (active_path && indexed_path && vertical_tab){    
    tempObject = $(active_path);
    
    // Load active path in the editor
    Drupal.Sweaver.editSelection(tempObject);
    
    // Reset full path
    $('#sweaver_plugin_editor #full-path div[id^=sid-]').removeClass('active');
    Drupal.Sweaver.pathIndexes = [];
    
    // Apply indexed path
    $.each(indexed_path.split(' '), function(index, value){
      specific_path = value.split('-');
      if (specific_path.length == 2) {
        $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0]).addClass('active');
        Drupal.Sweaver.addToActivePathIndex(specific_path[0]);
        Drupal.Sweaver.pathIndexes.sort(function(a,b){return a - b});
        
        if (specific_path[1].match('^[0-9]+$')) {
        // Alternative Class  
          Drupal.Sweaver.path[specific_path[0]].preferredSelector = specific_path[1];
          
          $('#sid-' + specific_path[0] + ' .first-selector a').html(Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[specific_path[0]])[0]);
          
          $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0] + ' .selectors li').removeClass('active');
          $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0] + ' #ssid-' + specific_path[1]).parent().addClass('active');
        }
        else {
        // Pseudo Class
          Drupal.Sweaver.path[specific_path[0]].pseudoClass = ':' + specific_path[1];
          Drupal.Sweaver.path[specific_path[0]].translation = Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[specific_path[0]]);
          $('#sid-' + specific_path[0] + ' .first-selector a').html(Drupal.Sweaver.path[specific_path[0]].translation[0]);
          
          $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0] + ' .pseudoclasses .' + specific_path[1]).parent().addClass('active');
        }
      }
    });
    Drupal.Sweaver.printActivePath();
    Drupal.Sweaver.activeElement = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] : {} ;
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();
    
    $('#sweaver_plugin_editor #sweaver-editor #' + vertical_tab + ' a').click();
    
    Drupal.Sweaver.cookie('sweaver_active_path', null);
    Drupal.Sweaver.cookie('sweaver_indexed_path', null);
    Drupal.Sweaver.cookie('sweaver_active_vertical_tab', null);
  }
}


/**
 * Build a Sweaver object.
 */
Drupal.Sweaver.buildSweaverObject = function(object) {
  var tempObject = new Object;
  tempObject.id = object.attr('id');
  tempObject.classes = trim(object.attr('class')).split(' ');
  tempObject.pseudoClass = '';
  tempObject.tag = object.get(0).tagName.toLowerCase();
  tempObject.type = object.css('display');

  // Fallback to block if an unknow type is detected.
  if (!(tempObject.type in Drupal.Sweaver.types)) {
    tempObject.type = 'block';
  }

  // Generate a human-readable name and a css selector.
  Drupal.Sweaver.objectToReadable(tempObject);
  return tempObject;
}

/**
 * Helper function to remove trailing leading and multiple spaces.
 */
function trim(s) {
  s = s.replace(/(^\s*)|(\s*$)/gi,"");
  s = s.replace(/[ ]{2,}/gi," ");
  s = s.replace(/\n /,"\n");
  return s;
}

/**
 * Hide all sliders.
 */
Drupal.Sweaver.hideOverlays = function() {
  $('#sweaver .slider-wrapper').css({'visibility' : 'hidden'});

  // Remove all active classes from form-items and groups
  $('#sweaver_plugin_editor .form-item, #sweaver_plugin_editor .sweaver-group').removeClass('active');
}

/**
 * Check wether the editor tab is visible.
 */
Drupal.Sweaver.visible = function() {
  if (Drupal.Sweaver.open == 'true' && $('#sweaver_plugin_editor .sweaver-content').is(':visible')) {
    return true;
  }
  else {
    return false;
  }
}

/**
 * Helper function to check if an object is empty.
 */
function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}


/**
 * Add custom expression to exclude all selectors in the sweaver bar.
 */
$.expr[':'].parents = function(a,i,m){
  return jQuery(a).parents(m[3]).length < 1;
};

})(jQuery);;
/*
 * jQuery JSON Plugin
 * version: 2.1 (2009-08-14)
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Brantley Harris wrote this plugin. It is based somewhat on the JSON.org 
 * website's http://www.json.org/json2.js, which proclaims:
 * "NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.", a sentiment that
 * I uphold.
 *
 * It is also influenced heavily by MochiKit's serializeJSON, which is 
 * copyrighted 2005 by Bob Ippolito.
 */
 
(function($) {
    /** jQuery.toJSON( json-serializble )
        Converts the given argument into a JSON respresentation.

        If an object has a "toJSON" function, that will be used to get the representation.
        Non-integer/string keys are skipped in the object, as are keys that point to a function.

        json-serializble:
            The *thing* to be converted.
     **/
    $.toJSON = function(o)
    {
        if (typeof(JSON) == 'object' && JSON.stringify)
            return JSON.stringify(o);
        
        var type = typeof(o);
    
        if (o === null)
            return "null";
    
        if (type == "undefined")
            return undefined;
        
        if (type == "number" || type == "boolean")
            return o + "";
    
        if (type == "string")
            return $.quoteString(o);
    
        if (type == 'object')
        {
            if (typeof o.toJSON == "function") 
                return $.toJSON( o.toJSON() );
            
            if (o.constructor === Date)
            {
                var month = o.getUTCMonth() + 1;
                if (month < 10) month = '0' + month;

                var day = o.getUTCDate();
                if (day < 10) day = '0' + day;

                var year = o.getUTCFullYear();
                
                var hours = o.getUTCHours();
                if (hours < 10) hours = '0' + hours;
                
                var minutes = o.getUTCMinutes();
                if (minutes < 10) minutes = '0' + minutes;
                
                var seconds = o.getUTCSeconds();
                if (seconds < 10) seconds = '0' + seconds;
                
                var milli = o.getUTCMilliseconds();
                if (milli < 100) milli = '0' + milli;
                if (milli < 10) milli = '0' + milli;

                return '"' + year + '-' + month + '-' + day + 'T' +
                             hours + ':' + minutes + ':' + seconds + 
                             '.' + milli + 'Z"'; 
            }

            if (o.constructor === Array) 
            {
                var ret = [];
                for (var i = 0; i < o.length; i++)
                    ret.push( $.toJSON(o[i]) || "null" );

                return "[" + ret.join(",") + "]";
            }
        
            var pairs = [];
            for (var k in o) {
                var name;
                var type = typeof k;

                if (type == "number")
                    name = '"' + k + '"';
                else if (type == "string")
                    name = $.quoteString(k);
                else
                    continue;  //skip non-string or number keys
            
                if (typeof o[k] == "function") 
                    continue;  //skip pairs where the value is a function.
            
                var val = $.toJSON(o[k]);
            
                pairs.push(name + ":" + val);
            }

            return "{" + pairs.join(", ") + "}";
        }
    };

    /** jQuery.evalJSON(src)
        Evaluates a given piece of json source.
     **/
    $.evalJSON = function(src)
    {
        if (typeof(JSON) == 'object' && JSON.parse)
            return JSON.parse(src);
        return eval("(" + src + ")");
    };
    
    /** jQuery.secureEvalJSON(src)
        Evals JSON in a way that is *more* secure.
    **/
    $.secureEvalJSON = function(src)
    {
        if (typeof(JSON) == 'object' && JSON.parse)
            return JSON.parse(src);
        
        var filtered = src;
        filtered = filtered.replace(/\\["\\\/bfnrtu]/g, '@');
        filtered = filtered.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
        filtered = filtered.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
        
        if (/^[\],:{}\s]*$/.test(filtered))
            return eval("(" + src + ")");
        else
            throw new SyntaxError("Error parsing JSON, source is not valid.");
    };

    /** jQuery.quoteString(string)
        Returns a string-repr of a string, escaping quotes intelligently.  
        Mostly a support function for toJSON.
    
        Examples:
            >>> jQuery.quoteString("apple")
            "apple"
        
            >>> jQuery.quoteString('"Where are we going?", she asked.')
            "\"Where are we going?\", she asked."
     **/
    $.quoteString = function(string)
    {
        if (string.match(_escapeable))
        {
            return '"' + string.replace(_escapeable, function (a) 
            {
                var c = _meta[a];
                if (typeof c === 'string') return c;
                c = a.charCodeAt();
                return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            }) + '"';
        }
        return '"' + string + '"';
    };
    
    var _escapeable = /["\\\x00-\x1f\x7f-\x9f]/g;
    
    var _meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    };
})(jQuery);
;
/**
 *
 * Color picker
 * Author: Stefan Petre www.eyecon.ro
 *
 * Dual licensed under the MIT and GPL licenses
 *
 */
(function ($) {
	var ColorPicker = function () {
		var
			ids = {},
			inAction,
			charMin = 65,
			visible,
			tpl = '<div class="colorpicker"><div class="colorpicker_color"><div><div></div></div></div><div class="colorpicker_hue"><div></div></div><div class="colorpicker_new_color"></div><div class="colorpicker_current_color"></div><div class="colorpicker_hex"><input type="text" maxlength="6" size="6" /></div><div class="colorpicker_rgb_r colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_rgb_g colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_rgb_b colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_hsb_h colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_hsb_s colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_hsb_b colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_transparent"><a href="" title="Make transparent" alt="Make transparent">Transparent</a></div><div class="colorpicker_submit"></div><div class="colorpicker_previous_colors"></div></div>',
			defaults = {
				eventName: 'click',
				onShow: function () {},
				onBeforeShow: function(){},
				onHide: function () {},
				onChange: function () {},
				onSubmit: function () {},
				color: 'ff0000',
				livePreview: true,
				flat: false
			},
			fillRGBFields = function  (hsb, cal) {
				var rgb = HSBToRGB(hsb);
				$(cal).data('colorpicker').fields
					.eq(1).val(rgb.r).end()
					.eq(2).val(rgb.g).end()
					.eq(3).val(rgb.b).end();
			},
			fillHSBFields = function  (hsb, cal) {
				$(cal).data('colorpicker').fields
					.eq(4).val(hsb.h).end()
					.eq(5).val(hsb.s).end()
					.eq(6).val(hsb.b).end();
			},
			fillHexFields = function (hsb, cal) {
				$(cal).data('colorpicker').fields
					.eq(0).val(HSBToHex(hsb)).end();
			},
			setSelector = function (hsb, cal) {
				$(cal).data('colorpicker').selector.css('backgroundColor', '#' + HSBToHex({h: hsb.h, s: 100, b: 100}));
				$(cal).data('colorpicker').selectorIndic.css({
					left: parseInt(150 * hsb.s/100, 10),
					top: parseInt(150 * (100-hsb.b)/100, 10)
				});
			},
			setHue = function (hsb, cal) {
				$(cal).data('colorpicker').hue.css('top', parseInt(150 - 150 * hsb.h/360, 10));
			},
			setCurrentColor = function (hsb, cal) {
				$(cal).data('colorpicker').currentColor.css('backgroundColor', '#' + HSBToHex(hsb));
			},
			setNewColor = function (hsb, cal) {
				$(cal).data('colorpicker').newColor.css('backgroundColor', '#' + HSBToHex(hsb));
			},
			keyDown = function (ev) {
				var pressedKey = ev.charCode || ev.keyCode || -1;
				if ((pressedKey > charMin && pressedKey <= 90) || pressedKey == 32) {
					return false;
				}
				var cal = $(this).parent().parent();
				if (cal.data('colorpicker').livePreview === true) {
					change.apply(this);
				}
			},
			change = function (ev) {
				var cal = $(this).parent().parent(), col;
				if (this.parentNode.className.indexOf('_hex') > 0) {
					cal.data('colorpicker').color = col = HexToHSB(fixHex(this.value));
				} else if (this.parentNode.className.indexOf('_hsb') > 0) {
					cal.data('colorpicker').color = col = fixHSB({
						h: parseInt(cal.data('colorpicker').fields.eq(4).val(), 10),
						s: parseInt(cal.data('colorpicker').fields.eq(5).val(), 10),
						b: parseInt(cal.data('colorpicker').fields.eq(6).val(), 10)
					});
				} else {
					cal.data('colorpicker').color = col = RGBToHSB(fixRGB({
						r: parseInt(cal.data('colorpicker').fields.eq(1).val(), 10),
						g: parseInt(cal.data('colorpicker').fields.eq(2).val(), 10),
						b: parseInt(cal.data('colorpicker').fields.eq(3).val(), 10)
					}));
				}
				if (ev) {
					fillRGBFields(col, cal.get(0));
					fillHexFields(col, cal.get(0));
					fillHSBFields(col, cal.get(0));
				}
				setSelector(col, cal.get(0));
				setHue(col, cal.get(0));
				setNewColor(col, cal.get(0));
				cal.data('colorpicker').onChange.apply(cal, [col, HSBToHex(col), HSBToRGB(col)]);
			},
			blur = function (ev) {
				var cal = $(this).parent().parent();
				cal.data('colorpicker').fields.parent().removeClass('colorpicker_focus');
			},
			focus = function () {
				charMin = this.parentNode.className.indexOf('_hex') > 0 ? 70 : 65;
				$(this).parent().parent().data('colorpicker').fields.parent().removeClass('colorpicker_focus');
				$(this).parent().addClass('colorpicker_focus');
			},
			downIncrement = function (ev) {
				var field = $(this).parent().find('input').focus();
				var current = {
					el: $(this).parent().addClass('colorpicker_slider'),
					max: this.parentNode.className.indexOf('_hsb_h') > 0 ? 360 : (this.parentNode.className.indexOf('_hsb') > 0 ? 100 : 255),
					y: ev.pageY,
					field: field,
					val: parseInt(field.val(), 10),
					preview: $(this).parent().parent().data('colorpicker').livePreview
				};
				$(document).bind('mouseup', current, upIncrement);
				$(document).bind('mousemove', current, moveIncrement);
			},
			moveIncrement = function (ev) {
				ev.data.field.val(Math.max(0, Math.min(ev.data.max, parseInt(ev.data.val + ev.pageY - ev.data.y, 10))));
				if (ev.data.preview) {
					change.apply(ev.data.field.get(0), [true]);
				}
				return false;
			},
			upIncrement = function (ev) {
				change.apply(ev.data.field.get(0), [true]);
				ev.data.el.removeClass('colorpicker_slider').find('input').focus();
				$(document).unbind('mouseup', upIncrement);
				$(document).unbind('mousemove', moveIncrement);
				return false;
			},
			downHue = function (ev) {
				var current = {
					cal: $(this).parent(),
					y: $(this).offset().top
				};
				current.preview = current.cal.data('colorpicker').livePreview;
				$(document).bind('mouseup', current, upHue);
				$(document).bind('mousemove', current, moveHue);
        sweaver_add_colors(ev);
        return false;
			},
			moveHue = function (ev) {
				change.apply(
					ev.data.cal.data('colorpicker')
						.fields
						.eq(4)
						.val(parseInt(360*(150 - Math.max(0,Math.min(150,(ev.pageY - ev.data.y))))/150, 10))
						.get(0),
					[ev.data.preview]
				);
				return false;
			},
			upHue = function (ev) {
				fillRGBFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				fillHexFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				$(document).unbind('mouseup', upHue);
				$(document).unbind('mousemove', moveHue);
        sweaver_add_colors(ev);
				return false;
			},
			downSelector = function (ev) {
				var current = {
					cal: $(this).parent(),
					pos: $(this).offset()
				};
				current.preview = current.cal.data('colorpicker').livePreview;
				$(document).bind('mouseup', current, upSelector);
				$(document).bind('mousemove', current, moveSelector);
			},

      // ************************
      // Sweaver additions
      // ************************

			// Do selection also when clicking.
			clickSelector = function (ev) {
				var current = {
					cal: $(this).parent(),
					pos: $(this).offset()
				};
				current.preview = current.cal.data('colorpicker').livePreview;
				ev.data = {};
				ev.data.cal = current.cal;
				ev.data.pos = current.pos;
				moveSelector(ev);
			},

			// Add a transparent option as background-color.
			makeTransparent = function(ev) {
				var cal = $(this).parent().parent(), col;
				cal.data('colorpicker').onChange.apply(cal, ['transparent', 'transparent', 'transparent']);
				return false;
			},

      // Select previous color.
      selectPreviousColor = function(ev) {

        // Create new color.
        var new_color = {};
        color = $(this).css('background-color').replace('rgb(', '').replace(')', '').split(',');
        new_color.r = color[0];
        new_color.g = color[1];
        new_color.b = color[2];
        new_color = fixRGB(new_color);
        new_color = RGBToHSB(new_color);
        new_color = fixHSB(new_color);

        var cal = $(this).parent().parent(), col;

        // Set the new color.
        fillRGBFields(new_color, cal);
        fillHexFields(new_color, cal);
        fillHSBFields(new_color, cal);
        setSelector(new_color, cal);
        setHue(new_color, cal);
        setNewColor(new_color, cal);
        cal.data('colorpicker').onChange.apply(cal, [new_color, HSBToHex(new_color), HSBToRGB(new_color)]);

        // Update pallet.
        sweaver_add_colors(ev);
      },

      // Add previous colors.
      sweaver_add_colors = function (ev) {
        colors = '';
        var new_color = '';
        previous_colors = new Array;

        for (var key in Drupal.Sweaver.css) {
          var target = Drupal.Sweaver.css[key];
          for (var prop in target) {
            if (Drupal.Sweaver.properties[prop]) {
              var properties = Drupal.Sweaver.properties[prop]['property'].split(' ');
              $.each(properties, function(i, property) {
                // Don't add a prefix and suffix for these exceptions.
                if ((property == 'background-color' || property == 'color') && target[prop] != 'transparent' && $.inArray(target[prop], previous_colors) < 0) {
                  previous_colors.push(target[prop]);
                  colors += '<div class="colorpicker_previous_colors_color" style="background-color: #'+ target[prop] +';"></div>';
                }
              });
            }
          }
        }

        var cal = $(this).parent().parent(), col;

        $('.colorpicker_previous_colors').html(colors);
        // Bind on colorpicker_previous_colors_color.
        $('.colorpicker_previous_colors_color').bind('click', selectPreviousColor);
      },

      // ************************
      // End of sweaver additions
      // ************************

			moveSelector = function (ev) {
				change.apply(
					ev.data.cal.data('colorpicker')
						.fields
						.eq(6)
						.val(parseInt(100*(150 - Math.max(0,Math.min(150,(ev.pageY - ev.data.pos.top))))/150, 10))
						.end()
						.eq(5)
						.val(parseInt(100*(Math.max(0,Math.min(150,(ev.pageX - ev.data.pos.left))))/150, 10))
						.get(0),
					[ev.data.preview]
				);
				return false;
			},
			upSelector = function (ev) {
				fillRGBFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				fillHexFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				$(document).unbind('mouseup', upSelector);
				$(document).unbind('mousemove', moveSelector);
        sweaver_add_colors(ev);
				return false;
			},
			enterSubmit = function (ev) {
				$(this).addClass('colorpicker_focus');
			},
			leaveSubmit = function (ev) {
				$(this).removeClass('colorpicker_focus');
			},
			clickSubmit = function (ev) {
				var cal = $(this).parent();
				var col = cal.data('colorpicker').color;
				cal.data('colorpicker').origColor = col;
				setCurrentColor(col, cal.get(0));
				cal.data('colorpicker').onSubmit(col, HSBToHex(col), HSBToRGB(col), cal.data('colorpicker').el);
			},
			show = function (ev) {
				var cal = $('#' + $(this).data('colorpickerId'));
				cal.data('colorpicker').onBeforeShow.apply(this, [cal.get(0)]);
				var pos = $(this).offset();
				var viewPort = getViewport();
				var top = pos.top + this.offsetHeight;
				var left = pos.left;
				if (top + 176 > viewPort.t + viewPort.h) {
					top -= this.offsetHeight + 176;
				}
				if (left + 356 > viewPort.l + viewPort.w) {
					left -= 356;
				}
				cal.css({left: left + 'px', top: top + 'px'});
				if (cal.data('colorpicker').onShow.apply(this, [cal.get(0)]) != false) {
					cal.show();
				}
				$(document).bind('mousedown', {cal: cal}, hide);
        sweaver_add_colors(ev);
				return false;
			},
			hide = function (ev) {
				if (!isChildOf(ev.data.cal.get(0), ev.target, ev.data.cal.get(0))) {
					if (ev.data.cal.data('colorpicker').onHide.apply(this, [ev.data.cal.get(0)]) != false) {
						ev.data.cal.hide();
					}
					$(document).unbind('mousedown', hide);
				}
			},
			isChildOf = function(parentEl, el, container) {
				if (parentEl == el) {
					return true;
				}
				if (parentEl.contains) {
					return parentEl.contains(el);
				}
				if ( parentEl.compareDocumentPosition ) {
					return !!(parentEl.compareDocumentPosition(el) & 16);
				}
				var prEl = el.parentNode;
				while(prEl && prEl != container) {
					if (prEl == parentEl)
						return true;
					prEl = prEl.parentNode;
				}
				return false;
			},
			getViewport = function () {
				var m = document.compatMode == 'CSS1Compat';
				return {
					l : window.pageXOffset || (m ? document.documentElement.scrollLeft : document.body.scrollLeft),
					t : window.pageYOffset || (m ? document.documentElement.scrollTop : document.body.scrollTop),
					w : window.innerWidth || (m ? document.documentElement.clientWidth : document.body.clientWidth),
					h : window.innerHeight || (m ? document.documentElement.clientHeight : document.body.clientHeight)
				};
			},
			fixHSB = function (hsb) {
				return {
					h: Math.min(360, Math.max(0, hsb.h)),
					s: Math.min(100, Math.max(0, hsb.s)),
					b: Math.min(100, Math.max(0, hsb.b))
				};
			},
			fixRGB = function (rgb) {
				return {
					r: Math.min(255, Math.max(0, rgb.r)),
					g: Math.min(255, Math.max(0, rgb.g)),
					b: Math.min(255, Math.max(0, rgb.b))
				};
			},
			fixHex = function (hex) {
				var len = 6 - hex.length;
				if (len > 0) {
					var o = [];
					for (var i=0; i<len; i++) {
						o.push('0');
					}
					o.push(hex);
					hex = o.join('');
				}
				return hex;
			},
			HexToRGB = function (hex) {
				var hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
				return {r: hex >> 16, g: (hex & 0x00FF00) >> 8, b: (hex & 0x0000FF)};
			},
			HexToHSB = function (hex) {
				return RGBToHSB(HexToRGB(hex));
			},
			RGBToHSB = function (rgb) {
				var hsb = {
					h: 0,
					s: 0,
					b: 0
				};
				var min = Math.min(rgb.r, rgb.g, rgb.b);
				var max = Math.max(rgb.r, rgb.g, rgb.b);
				var delta = max - min;
				hsb.b = max;
				if (max != 0) {

				}
				hsb.s = max != 0 ? 255 * delta / max : 0;
				if (hsb.s != 0) {
					if (rgb.r == max) {
						hsb.h = (rgb.g - rgb.b) / delta;
					} else if (rgb.g == max) {
						hsb.h = 2 + (rgb.b - rgb.r) / delta;
					} else {
						hsb.h = 4 + (rgb.r - rgb.g) / delta;
					}
				} else {
					hsb.h = -1;
				}
				hsb.h *= 60;
				if (hsb.h < 0) {
					hsb.h += 360;
				}
				hsb.s *= 100/255;
				hsb.b *= 100/255;

        // Sweaver : round to avoid minor differences when re-selecting colors.
        hsb.h = Math.round(hsb.h);
        hsb.s = Math.round(hsb.s);
        hsb.b = Math.round(hsb.b);

				return hsb;
			},
			HSBToRGB = function (hsb) {
				var rgb = {};
				var h = Math.round(hsb.h);
				var s = Math.round(hsb.s*255/100);
				var v = Math.round(hsb.b*255/100);
				if(s == 0) {
					rgb.r = rgb.g = rgb.b = v;
				} else {
					var t1 = v;
					var t2 = (255-s)*v/255;
					var t3 = (t1-t2)*(h%60)/60;
					if(h==360) h = 0;
					if(h<60) {rgb.r=t1;	rgb.b=t2; rgb.g=t2+t3}
					else if(h<120) {rgb.g=t1; rgb.b=t2;	rgb.r=t1-t3}
					else if(h<180) {rgb.g=t1; rgb.r=t2;	rgb.b=t2+t3}
					else if(h<240) {rgb.b=t1; rgb.r=t2;	rgb.g=t1-t3}
					else if(h<300) {rgb.b=t1; rgb.g=t2;	rgb.r=t2+t3}
					else if(h<360) {rgb.r=t1; rgb.g=t2;	rgb.b=t1-t3}
					else {rgb.r=0; rgb.g=0;	rgb.b=0}
				}
				return {r:Math.round(rgb.r), g:Math.round(rgb.g), b:Math.round(rgb.b)};
			},
			RGBToHex = function (rgb) {
				var hex = [
					rgb.r.toString(16),
					rgb.g.toString(16),
					rgb.b.toString(16)
				];
				$.each(hex, function (nr, val) {
					if (val.length == 1) {
						hex[nr] = '0' + val;
					}
				});
				return hex.join('');
			},
			HSBToHex = function (hsb) {
				return RGBToHex(HSBToRGB(hsb));
			},
			restoreOriginal = function () {
				var cal = $(this).parent();
				var col = cal.data('colorpicker').origColor;
				cal.data('colorpicker').color = col;
				fillRGBFields(col, cal.get(0));
				fillHexFields(col, cal.get(0));
				fillHSBFields(col, cal.get(0));
				setSelector(col, cal.get(0));
				setHue(col, cal.get(0));
				setNewColor(col, cal.get(0));
			};
		return {
			init: function (opt) {
				opt = $.extend({}, defaults, opt||{});
				if (typeof opt.color == 'string') {
					opt.color = HexToHSB(opt.color);
				} else if (opt.color.r != undefined && opt.color.g != undefined && opt.color.b != undefined) {
					opt.color = RGBToHSB(opt.color);
				} else if (opt.color.h != undefined && opt.color.s != undefined && opt.color.b != undefined) {
					opt.color = fixHSB(opt.color);
				} else {
					return this;
				}
				return this.each(function () {
					if (!$(this).data('colorpickerId')) {
						var options = $.extend({}, opt);
						options.origColor = opt.color;
						var id = 'collorpicker_' + parseInt(Math.random() * 1000);
						$(this).data('colorpickerId', id);
						var cal = $(tpl).attr('id', id);
						if (options.flat) {
							cal.appendTo(this).show();
						} else {
							cal.appendTo(document.body);
						}
						options.fields = cal
											.find('input')
												.bind('keyup', keyDown)
												.bind('change', change)
												.bind('blur', blur)
												.bind('focus', focus);
						cal
							.find('span').bind('mousedown', downIncrement).end()
							.find('>div.colorpicker_current_color').bind('click', restoreOriginal);
						// Also add clickselector on click.
						options.selector = cal.find('div.colorpicker_color').bind('mousedown', downSelector).bind('click', clickSelector);
						options.selectorIndic = options.selector.find('div div');
						options.el = this;
						options.hue = cal.find('div.colorpicker_hue div');
						cal.find('div.colorpicker_hue').bind('mousedown', downHue);
						options.newColor = cal.find('div.colorpicker_new_color');
						options.currentColor = cal.find('div.colorpicker_current_color');
						cal.data('colorpicker', options);
						cal.find('div.colorpicker_submit')
							.bind('mouseenter', enterSubmit)
							.bind('mouseleave', leaveSubmit)
							.bind('click', clickSubmit);
						// Transparent.
						cal.find('div.colorpicker_transparent a').bind('click', makeTransparent);
						fillRGBFields(options.color, cal.get(0));
						fillHSBFields(options.color, cal.get(0));
						fillHexFields(options.color, cal.get(0));
						setHue(options.color, cal.get(0));
						setSelector(options.color, cal.get(0));
						setCurrentColor(options.color, cal.get(0));
						setNewColor(options.color, cal.get(0));
						if (options.flat) {
							cal.css({
								position: 'relative',
								display: 'block'
							});
						} else {
							$(this).bind(options.eventName, show);
						}
					}
				});
			},
			showPicker: function() {
				return this.each( function () {
					if ($(this).data('colorpickerId')) {
						show.apply(this);
					}
				});
			},
			hidePicker: function() {
				return this.each( function () {
					if ($(this).data('colorpickerId')) {
						$('#' + $(this).data('colorpickerId')).hide();
					}
				});
			},
			setColor: function(col) {
				if (typeof col == 'string') {
					col = HexToHSB(col);
				} else if (col.r != undefined && col.g != undefined && col.b != undefined) {
					col = RGBToHSB(col);
				} else if (col.h != undefined && col.s != undefined && col.b != undefined) {
					col = fixHSB(col);
				} else {
					return this;
				}
				return this.each(function(){
					if ($(this).data('colorpickerId')) {
						var cal = $('#' + $(this).data('colorpickerId'));
						cal.data('colorpicker').color = col;
						cal.data('colorpicker').origColor = col;
						fillRGBFields(col, cal.get(0));
						fillHSBFields(col, cal.get(0));
						fillHexFields(col, cal.get(0));
						setHue(col, cal.get(0));
						setSelector(col, cal.get(0));
						setCurrentColor(col, cal.get(0));
						setNewColor(col, cal.get(0));
					}
				});
			}
		};
	}();
	$.fn.extend({
		ColorPicker: ColorPicker.init,
		ColorPickerHide: ColorPicker.hidePicker,
		ColorPickerShow: ColorPicker.showPicker,
		ColorPickerSetColor: ColorPicker.setColor
	});
})(jQuery);

/**
 * @file
 * Styles javascript.
 */

(function ($) {

/**
 * Start autosave poller.
 */
$(document).ready(function() {
  var span = 0;
  if (Drupal.settings.sweaver['autosave'] != undefined) {
	var interval = Drupal.settings.sweaver['autosave'];
    if (parseInt(interval) > 0) {
      var interval = (interval * 1000) + span;
      var autosave = setInterval('Drupal.Sweaver.AutoSave()', interval);
      span += 100;
    }
  }
});

/**
 * Always save when leaving the page.
 */
$(window).unload(function() {
  Drupal.Sweaver.AutoSave();
});

/**
 * Autosave function.
 */
Drupal.Sweaver.AutoSave = function(context) {
  if (Drupal.Sweaver.changed) {
    Drupal.Sweaver.changed = false;
  	
    var ajax_data = {};
    
    // Get values for css, customcss & palette (if available)
    if ($('[name=sweaver-css]').length) {
      ajax_data.css = $('[name=sweaver-css]').val();
    }
    if ($('#edit-sweaver-plugin-custom-css').length) {
      ajax_data.customcss = $('#edit-sweaver-plugin-custom-css').val();      
    }
    if ($('[name=sweaver-plugin-palette]').length) {
      ajax_data.palette = $('[name=sweaver-plugin-palette]').val();
    }
    var managed_file_fid = 0;
    $('#sweaver input[type=hidden][name$="[fid]"]').each(function(){ 
      if ($(this).val() != 0){
        ajax_data.managed_file_fid = $(this).val();
      }
    });

    $.ajax({
      type: "POST",
      url: Drupal.settings.basePath + 'index.php?q=sweaver-autosave',
      data: ajax_data,
      dataType: 'json',
      timeout: 5000,
      success: function(data){
        if (typeof data['message'] == 'undefined' || data['message'] != 0) {
          Drupal.Sweaver.setMessage(Drupal.t('Your changes have been saved.'), 2000);
        }
        if (typeof data['error'] == 'undefined' || data['error'] != 0) {
          Drupal.Sweaver.setMessage(Drupal.t('Your changes have been saved.'), 2000);
        }
      },
      error: function() {
        Drupal.Sweaver.setMessage(Drupal.t('There was an error saving current changes!'), 2000);
      }
    });
    return false;
  }	  
}

/**
 * Behaviors for style actions.
 */
Drupal.behaviors.StylesActions = {
  attach: function(context) {
    $("#style-actions-data-1 select.radio-style-save-type").change(function() {
      var radio_style_save_type = $("#style-actions-data-1 select.radio-style-save-type option:selected").val();
      if (radio_style_save_type == 1) {
        $('#edit-save-style').hide();
        $('#edit-style-existing-id').show();
      }
      else {
        $('#edit-save-style').show();
        $('#edit-style-existing-id').hide();
      }
    });

    $("#sweaver-popup #edit-delete-confirm").click(function() {
      $('#sweaver-popup .delete-style-confirm').hide();
      $('#sweaver-popup .delete-style-question').show();
      return false;
    });

    $("#sweaver-popup #edit-delete-cancel").click(function() {
      $('#sweaver-popup .delete-style-confirm').show();
      $('#sweaver-popup .delete-style-question').hide();
      return false;
    });
  }
};

})(jQuery);;

/**
 * Add an extra color css
 */

(function ($) {

/**
 * Hook onload behavior
 */
$(document).ready(function() {

  // Check if we need to load the stylesheet when the editor is active.
  var palette = $('#sweaver_plugin_palettes [name=sweaver_plugin_palette]').val();
  
  if (palette != '') {
    // Add a external stylesheet container in the head section.
    var link = '<link id="sweaver-palette" href="' + $('#palette-' + palette + ' .file').text() + '" media="all" rel="stylesheet" />';
    $('head').append(link);
  }
  
  $('#sweaver_plugin_palettes .colors').click(function(event) {
    Drupal.Sweaver.changed = true;
    
    var $this = $(this); 
    
    // Remove the stylesheet that was added through jQuery.
    if ($('head link#sweaver-palette').length > 0) {
      $('head link#sweaver-palette').remove();
    } 

    if ($this.hasClass('active')) {
      // Remove the active class.
      $this.removeClass('active'); 
      
      // Reset the active palette.
      $('#sweaver_plugin_palettes [name=sweaver_plugin_palette]').val('');
    }
    else {
	    // Add a external stylesheet container in the head section.
	    var link = '<link id="sweaver-palette" href="' + $('.file', this).text() + '" media="all" rel="stylesheet" />';
	    $('head').append(link);
	    
      // Remove the active classes.
      $('#sweaver_plugin_palettes .active').removeClass('active');
    	    
	    // Add an active class.
	    $this.addClass('active'); 
	    
	    // Set the active palette.
      $('#sweaver_plugin_palettes [name=sweaver_plugin_palette]').val($this.children('.key').text());
	  }
  });
});

})(jQuery);;

(function ($) {

/**
 * Implements Drupal.Sweaver.invokes.processCSS().
 */
Drupal.Sweaver.invokes.customcss = {
  execute: function (context, settings) {
    var fullCss = '';
    fullCss = $('#edit-sweaver-plugin-custom-css').val();
    return fullCss;
  }
};

/**
 * Preview button onclick behavior.
 */
Drupal.behaviors.SweaverCustomCss = {
  attach: function (context) {
    $('#edit-sweaver-plugin-custom-css-button').click(function(){
      Drupal.Sweaver.writeCss();
      Drupal.Sweaver.setMessage(Drupal.t('Your custom css has been succesfully applied.'), 5000);
      return false;
    });
  }
}

})(jQuery);;

/**
 * Sweaver WatchDog
 * Plugin used to list all modification made in the editor
 * Each modification can be hidden or deleted then
 * A hidden property is not displayed but is still saved so that the user can, at any moment, activate it
 */

(function ($) {
    
Drupal.Sweaver = Drupal.Sweaver || {};

/**
 * Hook onload behavior
 */
$(document).ready(function() {  
  Drupal.Sweaver.writeModifications();
  
  $('#tab-sweaver_plugin_advanced').click(function(){
    Drupal.Sweaver.writeModifications();
  });

});

/**
 * A simple function to update the screen after a modification
 */
Drupal.Sweaver.reloadInterface = function() {
  Drupal.Sweaver.writeCss();
  Drupal.Sweaver.updateForm();
  Drupal.Sweaver.writeModifications();
}

/**
 * Write all modifications made in the plugin's tab
 */
Drupal.Sweaver.writeModifications = function() {
  var data = ''; // Contains all data that will be form the #scrollable_area
  var key_id = 0; // Get an ID for the key
  var properties_counted = 0; // Count all properties modified
  var hidden_properties_counted = 0; // Count all properties modified that are hidden
  
  data += '<table>';
  for (key in Drupal.Sweaver.css) {
    key_id++;
    var target = Drupal.Sweaver.css[key];
    var temp_data = '';
    var sub_properties_counted = 0;
    var sub_hidden_properties_counted = 0;
    
    for (prop in target) {
      properties_counted++;
      sub_properties_counted++;
      
      if (Drupal.Sweaver.properties[prop] && (target[prop]['value'] != '' || target[prop]['value'] == '0')) {        
        if (target[prop]['hidden'] == true){
          temp_data += '<tr class="hidden" onclick="Drupal.Sweaver.showKey(' + key_id +')">';
        }
        else {
          temp_data += '<tr onclick="Drupal.Sweaver.showKey(' + key_id +')">';
        }
        
        // Special case for transparent.
        if ((prop == 'background-color' && target[prop]['value'] == 'transparent') || (prop == 'background-image' && target[prop]['value'] == 'none')) {
          temp_data += '<td class="property">' + prop + ' : ' + target[prop]['value'] + '</td>';
        }
        else {
          temp_data += '<td class="property">' + prop + ' : ' + Drupal.Sweaver.properties[prop].prefix + target[prop]['value'] + Drupal.Sweaver.properties[prop].suffix + '</td>';
        }
        
        if (target[prop]['hidden'] == true){
          var hide_class = 'disabled';
          var show_class = '';
          hidden_properties_counted++;
          sub_hidden_properties_counted++;
        }
        else {
          var hide_class = '';
          var show_class = 'disabled';
        }
        
        temp_data += '<td class="operations">';        
        temp_data += '<span class="delete" onclick="Drupal.Sweaver.deleteProperty(\'' + key + '\', \'' + prop + '\'); Drupal.Sweaver.writeModifications();">' + 'Delete' + '</span>';
        temp_data += '<span class="hide ' + hide_class + '" onclick="Drupal.Sweaver.propertyHider(\'' + key + '\', \'' + prop + '\');">Hide</span>';
        temp_data += '<span class="show ' + show_class + '" onclick="Drupal.Sweaver.propertyHider(\'' + key + '\', \'' + prop + '\');">Show</span>';
        temp_data += '</td></tr>';
      }
    }
    
    if (sub_properties_counted == sub_hidden_properties_counted) {
      var hide_class = 'disabled';
      var show_class = '';
    }
    else if (sub_hidden_properties_counted == 0) {
      var hide_class = '';
      var show_class = 'disabled';
    }
    else {
      var hide_class = '';
      var show_class = '';
    }
    
    data += '<tr class="separator" onclick="Drupal.Sweaver.showKey(' + key_id +')"><th>' + key + '</th><td class="operations">';
    data += '<span class="title delete" onclick="Drupal.Sweaver.deleteKeyProperties(\'' + key + '\');">Delete</span>';
    data += '<span class="title hide ' + hide_class + '" onclick="Drupal.Sweaver.keyPropertiesHider(\'' + key + '\', true);">Hide</span>';
    data += '<span class="title show ' + show_class + '" onclick="Drupal.Sweaver.keyPropertiesHider(\'' + key + '\', false);">Show</span>';
    data += '</td></tr>';
    data += temp_data;
  }
  data += '</table>';
  $('#watchdog #scrollable_area').html(data);
  
  if (properties_counted == hidden_properties_counted) {
    $('#watchdog .header .operations .hide').addClass('disabled');
    $('#watchdog .header .operations .show').removeClass('disabled');
  }
  else if (hidden_properties_counted == 0) {
    $('#watchdog .header .operations .hide').removeClass('disabled');
    $('#watchdog .header .operations .show').addClass('disabled');
  }
  else {
    $('#watchdog .header .operations .hide').removeClass('disabled');
    $('#watchdog .header .operations .show').removeClass('disabled');
  }
}

/**
 * Select a container from a key_id
 * This container is selected on the screen (class sweaver-clicked)
 */
Drupal.Sweaver.showKey = function (key_id) {
  var counter = 0;
  for (key in Drupal.Sweaver.css) {
    counter++;
    if (counter ==  key_id) {
      $('.sweaver-clicked').removeClass('sweaver-clicked');
      $(key).addClass('sweaver-clicked');
    }
  }
  $('#watchdog tr').removeClass('active');
  $('#watchdog tr[onclick=Drupal.Sweaver.showKey(' + key_id + ')]').addClass('active');
}

/**
 * Delete all properties modified with the editor that are applied to a specified container (key)
 */
Drupal.Sweaver.deleteKeyProperties = function(key) {
  delete Drupal.Sweaver.css[key];
  
  Drupal.Sweaver.reloadInterface();
}

/**
 * Delete all properties modified with the editor
 */
Drupal.Sweaver.deleteAllProperties = function() {
  Drupal.Sweaver.css = new Object();
  
  Drupal.Sweaver.reloadInterface();
}

/**
 * Hide one property
 * key (string) the container
 * property (string) the property to hide
 */
Drupal.Sweaver.propertyHider = function(key, property) {
  var target = Drupal.Sweaver.css[key];
  for (prop in target) {
    if (prop == property) {
      Drupal.Sweaver.css[key][property]['hidden'] = !Drupal.Sweaver.css[key][property]['hidden'];
      
      Drupal.Sweaver.reloadInterface();
    }
  }
}

/**
 * Hide or Show (dependent on the value of hide) all properties that are in a specified container (key)
 */
Drupal.Sweaver.keyPropertiesHider = function(key, hide) {
  var target = Drupal.Sweaver.css[key];
  for (prop in target) {
    Drupal.Sweaver.css[key][prop]['hidden'] = hide;
  }
  
  Drupal.Sweaver.reloadInterface();
}

/**
 * Hide all properties made in the editor
 */
Drupal.Sweaver.cssHider = function(hide) {
  for (key in Drupal.Sweaver.css) {
    var target = Drupal.Sweaver.css[key];
    for (prop in target) {
      Drupal.Sweaver.css[key][prop]['hidden'] = hide;
    }
  }
  Drupal.Sweaver.reloadInterface();
}

})(jQuery);;
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
 * See if the classes are found on the page.
 */
$(document).ready(function() {
  $('#sweaver_plugin_themeclasses .sweaver-switch-to-style').each(function() {
    var className = $(this).attr('id').replace('spt-', '');
    if ($('.'+ className).length == 0) {
      $(this).hide();
    }
  });
});

/**
 * Switch to style editor and start editing the class.
 */

Drupal.Sweaver.ThemeClasses = function(class_name, class_label) {

  // Switch tabs.
  var remove_tab = 'tab-sweaver_plugin_themeclasses';
  var show_tab = 'tab-sweaver_plugin_editor';
  Drupal.Sweaver.switchTab(remove_tab, show_tab);

  // Update the values for the Style tab.
  class_name = class_name.replace('spt-', '');
  class_label = class_label.replace('spt-', '');  
  Drupal.Sweaver.updateStyleTab(class_name, class_label);
}

})(jQuery);;
/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/

(function(jQuery){

  jQuery.hotkeys = {
    version: "0.8",

    specialKeys: {
      8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
      20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
      37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
      96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
      104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
      112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
      120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
    },

    shiftNums: {
      "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
      "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
      ".": ">",  "/": "?",  "\\": "|"
    }
  };

  function keyHandler( handleObj ) {
    // Only care when a possible input has been specified
    if ( typeof handleObj.data !== "string" ) {
      return;
    }

    var origHandler = handleObj.handler,
      keys = handleObj.data.toLowerCase().split(" ");

    handleObj.handler = function( event ) {
      // Don't fire in text-accepting inputs that we didn't directly bind to
      if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
         event.target.type === "text") ) {
        return;
      }

      // Keypress represents characters, not special keys
      var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
        character = String.fromCharCode( event.which ).toLowerCase(),
        key, modif = "", possible = {};

      // check combinations (alt|ctrl|shift+anything)
      if ( event.altKey && special !== "alt" ) {
        modif += "alt+";
      }

      if ( event.ctrlKey && special !== "ctrl" ) {
        modif += "ctrl+";
      }

      // TODO: Need to make sure this works consistently across platforms
      if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
        modif += "meta+";
      }

      if ( event.shiftKey && special !== "shift" ) {
        modif += "shift+";
      }

      if ( special ) {
        possible[ modif + special ] = true;

      } else {
        possible[ modif + character ] = true;
        possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

        // "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
        if ( modif === "shift+" ) {
          possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
        }
      }

      for ( var i = 0, l = keys.length; i < l; i++ ) {
        if ( possible[ keys[i] ] ) {
          return origHandler.apply( this, arguments );
        }
      }
    };
  }

  jQuery.each([ "keydown", "keyup", "keypress" ], function() {
    jQuery.event.special[ this ] = { add: keyHandler };
  });

})( jQuery );;

(function ($) {

/**
 * Add key bindings when the Styles plugin is enabled.
 *
 * List of key bindings can be found at
 * http://www.weverwijk.net/wordpress/2010/03/23/key-events-in-javascript/
 * https://github.com/jeresig/jquery.hotkeys
 *
 * More inspiration :
 * - http://rikrikrik.com/jquery/shortkeys/#download
 * - http://code.google.com/p/js-hotkeys/
 * - http://code.google.com/p/js-hotkeys/wiki/about
 */

var kb_popup = '';

/**
 * Bind the keys.
 */
$(document).ready(function() {
  $.each(Drupal.settings.sweaver['kb'], function (index, key_binding) {
    if (key_binding.element != '' && $(key_binding.element).length == 0) {
      return;
    }
    $(document).bind('keydown', key_binding.kb_button, function(event) {
      Drupal.Sweaver.kbShowPopup(event, key_binding);
    });
  });
});

/**
 * Show or close the popup.
 */
Drupal.Sweaver.kbShowPopup = function(event, key_binding) {
  if (event.keyCode == parseInt(key_binding.kb_code) && key_binding.element != '') {
    if (key_binding.kb_button != kb_popup) {
      kb_popup = key_binding.kb_button;
      Drupal.Sweaver.showPopup($(key_binding.element), '400px', '200px');
    }
  }
  else {
    kb_popup = '';
    Drupal.Sweaver.hidePopup();
  }
}

})(jQuery);
;
(function ($) {

/**
 * Hook up to page load and overlay to show active sweaver when appropiate.
 */
$(document).ready(function() {
  $(document).bind('drupalOverlayOpen', function() {
    $('a#toolbar-link-admin-sweaver').removeClass('active').parent().removeClass('active-trail active');
  }).bind('drupalOverlayClose', function() {
    $('a#toolbar-link-admin-sweaver').addClass('active').parent().addClass('active-trail active');
    $('ul#toolbar-home a').removeClass('active').parent().removeClass('active-trail active');
  });
  if(!Drupal.overlay.isOpen && !Drupal.overlay.isOpening) {
    $('a#toolbar-link-admin-sweaver').addClass('active').parent().addClass('active-trail active');
    $('ul#toolbar-home a').removeClass('active').parent().removeClass('active-trail active');
  }
});

})(jQuery);;
/*!
 * jQuery Cycle Plugin (with Transition Definitions)
 * Examples and documentation at: http://jquery.malsup.com/cycle/
 * Copyright (c) 2007-2013 M. Alsup
 * Version: 3.0.3 (11-JUL-2013)
 * Dual licensed under the MIT and GPL licenses.
 * http://jquery.malsup.com/license.html
 * Requires: jQuery v1.7.1 or later
 */
;(function($, undefined) {
"use strict";

var ver = '3.0.3';

function debug(s) {
	if ($.fn.cycle.debug)
		log(s);
}		
function log() {
	/*global console */
	if (window.console && console.log)
		console.log('[cycle] ' + Array.prototype.join.call(arguments,' '));
}
$.expr[':'].paused = function(el) {
	return el.cyclePause;
};


// the options arg can be...
//   a number  - indicates an immediate transition should occur to the given slide index
//   a string  - 'pause', 'resume', 'toggle', 'next', 'prev', 'stop', 'destroy' or the name of a transition effect (ie, 'fade', 'zoom', etc)
//   an object - properties to control the slideshow
//
// the arg2 arg can be...
//   the name of an fx (only used in conjunction with a numeric value for 'options')
//   the value true (only used in first arg == 'resume') and indicates
//	 that the resume should occur immediately (not wait for next timeout)

$.fn.cycle = function(options, arg2) {
	var o = { s: this.selector, c: this.context };

	// in 1.3+ we can fix mistakes with the ready state
	if (this.length === 0 && options != 'stop') {
		if (!$.isReady && o.s) {
			log('DOM not ready, queuing slideshow');
			$(function() {
				$(o.s,o.c).cycle(options,arg2);
			});
			return this;
		}
		// is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
		log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
		return this;
	}

	// iterate the matched nodeset
	return this.each(function() {
		var opts = handleArguments(this, options, arg2);
		if (opts === false)
			return;

		opts.updateActivePagerLink = opts.updateActivePagerLink || $.fn.cycle.updateActivePagerLink;
		
		// stop existing slideshow for this container (if there is one)
		if (this.cycleTimeout)
			clearTimeout(this.cycleTimeout);
		this.cycleTimeout = this.cyclePause = 0;
		this.cycleStop = 0; // issue #108

		var $cont = $(this);
		var $slides = opts.slideExpr ? $(opts.slideExpr, this) : $cont.children();
		var els = $slides.get();

		if (els.length < 2) {
			log('terminating; too few slides: ' + els.length);
			return;
		}

		var opts2 = buildOptions($cont, $slides, els, opts, o);
		if (opts2 === false)
			return;

		var startTime = opts2.continuous ? 10 : getTimeout(els[opts2.currSlide], els[opts2.nextSlide], opts2, !opts2.backwards);

		// if it's an auto slideshow, kick it off
		if (startTime) {
			startTime += (opts2.delay || 0);
			if (startTime < 10)
				startTime = 10;
			debug('first timeout: ' + startTime);
			this.cycleTimeout = setTimeout(function(){go(els,opts2,0,!opts.backwards);}, startTime);
		}
	});
};

function triggerPause(cont, byHover, onPager) {
	var opts = $(cont).data('cycle.opts');
	if (!opts)
		return;
	var paused = !!cont.cyclePause;
	if (paused && opts.paused)
		opts.paused(cont, opts, byHover, onPager);
	else if (!paused && opts.resumed)
		opts.resumed(cont, opts, byHover, onPager);
}

// process the args that were passed to the plugin fn
function handleArguments(cont, options, arg2) {
	if (cont.cycleStop === undefined)
		cont.cycleStop = 0;
	if (options === undefined || options === null)
		options = {};
	if (options.constructor == String) {
		switch(options) {
		case 'destroy':
		case 'stop':
			var opts = $(cont).data('cycle.opts');
			if (!opts)
				return false;
			cont.cycleStop++; // callbacks look for change
			if (cont.cycleTimeout)
				clearTimeout(cont.cycleTimeout);
			cont.cycleTimeout = 0;
			if (opts.elements)
				$(opts.elements).stop();
			$(cont).removeData('cycle.opts');
			if (options == 'destroy')
				destroy(cont, opts);
			return false;
		case 'toggle':
			cont.cyclePause = (cont.cyclePause === 1) ? 0 : 1;
			checkInstantResume(cont.cyclePause, arg2, cont);
			triggerPause(cont);
			return false;
		case 'pause':
			cont.cyclePause = 1;
			triggerPause(cont);
			return false;
		case 'resume':
			cont.cyclePause = 0;
			checkInstantResume(false, arg2, cont);
			triggerPause(cont);
			return false;
		case 'prev':
		case 'next':
			opts = $(cont).data('cycle.opts');
			if (!opts) {
				log('options not found, "prev/next" ignored');
				return false;
			}
			if (typeof arg2 == 'string') 
				opts.oneTimeFx = arg2;
			$.fn.cycle[options](opts);
			return false;
		default:
			options = { fx: options };
		}
		return options;
	}
	else if (options.constructor == Number) {
		// go to the requested slide
		var num = options;
		options = $(cont).data('cycle.opts');
		if (!options) {
			log('options not found, can not advance slide');
			return false;
		}
		if (num < 0 || num >= options.elements.length) {
			log('invalid slide index: ' + num);
			return false;
		}
		options.nextSlide = num;
		if (cont.cycleTimeout) {
			clearTimeout(cont.cycleTimeout);
			cont.cycleTimeout = 0;
		}
		if (typeof arg2 == 'string')
			options.oneTimeFx = arg2;
		go(options.elements, options, 1, num >= options.currSlide);
		return false;
	}
	return options;
	
	function checkInstantResume(isPaused, arg2, cont) {
		if (!isPaused && arg2 === true) { // resume now!
			var options = $(cont).data('cycle.opts');
			if (!options) {
				log('options not found, can not resume');
				return false;
			}
			if (cont.cycleTimeout) {
				clearTimeout(cont.cycleTimeout);
				cont.cycleTimeout = 0;
			}
			go(options.elements, options, 1, !options.backwards);
		}
	}
}

function removeFilter(el, opts) {
	if (!$.support.opacity && opts.cleartype && el.style.filter) {
		try { el.style.removeAttribute('filter'); }
		catch(smother) {} // handle old opera versions
	}
}

// unbind event handlers
function destroy(cont, opts) {
	if (opts.next)
		$(opts.next).unbind(opts.prevNextEvent);
	if (opts.prev)
		$(opts.prev).unbind(opts.prevNextEvent);
	
	if (opts.pager || opts.pagerAnchorBuilder)
		$.each(opts.pagerAnchors || [], function() {
			this.unbind().remove();
		});
	opts.pagerAnchors = null;
	$(cont).unbind('mouseenter.cycle mouseleave.cycle');
	if (opts.destroy) // callback
		opts.destroy(opts);
}

// one-time initialization
function buildOptions($cont, $slides, els, options, o) {
	var startingSlideSpecified;
	// support metadata plugin (v1.0 and v2.0)
	var opts = $.extend({}, $.fn.cycle.defaults, options || {}, $.metadata ? $cont.metadata() : $.meta ? $cont.data() : {});
	var meta = $.isFunction($cont.data) ? $cont.data(opts.metaAttr) : null;
	if (meta)
		opts = $.extend(opts, meta);
	if (opts.autostop)
		opts.countdown = opts.autostopCount || els.length;

	var cont = $cont[0];
	$cont.data('cycle.opts', opts);
	opts.$cont = $cont;
	opts.stopCount = cont.cycleStop;
	opts.elements = els;
	opts.before = opts.before ? [opts.before] : [];
	opts.after = opts.after ? [opts.after] : [];

	// push some after callbacks
	if (!$.support.opacity && opts.cleartype)
		opts.after.push(function() { removeFilter(this, opts); });
	if (opts.continuous)
		opts.after.push(function() { go(els,opts,0,!opts.backwards); });

	saveOriginalOpts(opts);

	// clearType corrections
	if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg)
		clearTypeFix($slides);

	// container requires non-static position so that slides can be position within
	if ($cont.css('position') == 'static')
		$cont.css('position', 'relative');
	if (opts.width)
		$cont.width(opts.width);
	if (opts.height && opts.height != 'auto')
		$cont.height(opts.height);

	if (opts.startingSlide !== undefined) {
		opts.startingSlide = parseInt(opts.startingSlide,10);
		if (opts.startingSlide >= els.length || opts.startSlide < 0)
			opts.startingSlide = 0; // catch bogus input
		else 
			startingSlideSpecified = true;
	}
	else if (opts.backwards)
		opts.startingSlide = els.length - 1;
	else
		opts.startingSlide = 0;

	// if random, mix up the slide array
	if (opts.random) {
		opts.randomMap = [];
		for (var i = 0; i < els.length; i++)
			opts.randomMap.push(i);
		opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
		if (startingSlideSpecified) {
			// try to find the specified starting slide and if found set start slide index in the map accordingly
			for ( var cnt = 0; cnt < els.length; cnt++ ) {
				if ( opts.startingSlide == opts.randomMap[cnt] ) {
					opts.randomIndex = cnt;
				}
			}
		}
		else {
			opts.randomIndex = 1;
			opts.startingSlide = opts.randomMap[1];
		}
	}
	else if (opts.startingSlide >= els.length)
		opts.startingSlide = 0; // catch bogus input
	opts.currSlide = opts.startingSlide || 0;
	var first = opts.startingSlide;

	// set position and zIndex on all the slides
	$slides.css({position: 'absolute', top:0, left:0}).hide().each(function(i) {
		var z;
		if (opts.backwards)
			z = first ? i <= first ? els.length + (i-first) : first-i : els.length-i;
		else
			z = first ? i >= first ? els.length - (i-first) : first-i : els.length-i;
		$(this).css('z-index', z);
	});

	// make sure first slide is visible
	$(els[first]).css('opacity',1).show(); // opacity bit needed to handle restart use case
	removeFilter(els[first], opts);

	// stretch slides
	if (opts.fit) {
		if (!opts.aspect) {
	        if (opts.width)
	            $slides.width(opts.width);
	        if (opts.height && opts.height != 'auto')
	            $slides.height(opts.height);
		} else {
			$slides.each(function(){
				var $slide = $(this);
				var ratio = (opts.aspect === true) ? $slide.width()/$slide.height() : opts.aspect;
				if( opts.width && $slide.width() != opts.width ) {
					$slide.width( opts.width );
					$slide.height( opts.width / ratio );
				}

				if( opts.height && $slide.height() < opts.height ) {
					$slide.height( opts.height );
					$slide.width( opts.height * ratio );
				}
			});
		}
	}

	if (opts.center && ((!opts.fit) || opts.aspect)) {
		$slides.each(function(){
			var $slide = $(this);
			$slide.css({
				"margin-left": opts.width ?
					((opts.width - $slide.width()) / 2) + "px" :
					0,
				"margin-top": opts.height ?
					((opts.height - $slide.height()) / 2) + "px" :
					0
			});
		});
	}

	if (opts.center && !opts.fit && !opts.slideResize) {
		$slides.each(function(){
			var $slide = $(this);
			$slide.css({
				"margin-left": opts.width ? ((opts.width - $slide.width()) / 2) + "px" : 0,
				"margin-top": opts.height ? ((opts.height - $slide.height()) / 2) + "px" : 0
			});
		});
	}
		
	// stretch container
	var reshape = (opts.containerResize || opts.containerResizeHeight) && $cont.innerHeight() < 1;
	if (reshape) { // do this only if container has no size http://tinyurl.com/da2oa9
		var maxw = 0, maxh = 0;
		for(var j=0; j < els.length; j++) {
			var $e = $(els[j]), e = $e[0], w = $e.outerWidth(), h = $e.outerHeight();
			if (!w) w = e.offsetWidth || e.width || $e.attr('width');
			if (!h) h = e.offsetHeight || e.height || $e.attr('height');
			maxw = w > maxw ? w : maxw;
			maxh = h > maxh ? h : maxh;
		}
		if (opts.containerResize && maxw > 0 && maxh > 0)
			$cont.css({width:maxw+'px',height:maxh+'px'});
		if (opts.containerResizeHeight && maxh > 0)
			$cont.css({height:maxh+'px'});
	}

	var pauseFlag = false;  // https://github.com/malsup/cycle/issues/44
	if (opts.pause)
		$cont.bind('mouseenter.cycle', function(){
			pauseFlag = true;
			this.cyclePause++;
			triggerPause(cont, true);
		}).bind('mouseleave.cycle', function(){
				if (pauseFlag)
					this.cyclePause--;
				triggerPause(cont, true);
		});

	if (supportMultiTransitions(opts) === false)
		return false;

	// apparently a lot of people use image slideshows without height/width attributes on the images.
	// Cycle 2.50+ requires the sizing info for every slide; this block tries to deal with that.
	var requeue = false;
	options.requeueAttempts = options.requeueAttempts || 0;
	$slides.each(function() {
		// try to get height/width of each slide
		var $el = $(this);
		this.cycleH = (opts.fit && opts.height) ? opts.height : ($el.height() || this.offsetHeight || this.height || $el.attr('height') || 0);
		this.cycleW = (opts.fit && opts.width) ? opts.width : ($el.width() || this.offsetWidth || this.width || $el.attr('width') || 0);

		if ( $el.is('img') ) {
			var loading = (this.cycleH === 0 && this.cycleW === 0 && !this.complete);
			// don't requeue for images that are still loading but have a valid size
			if (loading) {
				if (o.s && opts.requeueOnImageNotLoaded && ++options.requeueAttempts < 100) { // track retry count so we don't loop forever
					log(options.requeueAttempts,' - img slide not loaded, requeuing slideshow: ', this.src, this.cycleW, this.cycleH);
					setTimeout(function() {$(o.s,o.c).cycle(options);}, opts.requeueTimeout);
					requeue = true;
					return false; // break each loop
				}
				else {
					log('could not determine size of image: '+this.src, this.cycleW, this.cycleH);
				}
			}
		}
		return true;
	});

	if (requeue)
		return false;

	opts.cssBefore = opts.cssBefore || {};
	opts.cssAfter = opts.cssAfter || {};
	opts.cssFirst = opts.cssFirst || {};
	opts.animIn = opts.animIn || {};
	opts.animOut = opts.animOut || {};

	$slides.not(':eq('+first+')').css(opts.cssBefore);
	$($slides[first]).css(opts.cssFirst);

	if (opts.timeout) {
		opts.timeout = parseInt(opts.timeout,10);
		// ensure that timeout and speed settings are sane
		if (opts.speed.constructor == String)
			opts.speed = $.fx.speeds[opts.speed] || parseInt(opts.speed,10);
		if (!opts.sync)
			opts.speed = opts.speed / 2;
		
		var buffer = opts.fx == 'none' ? 0 : opts.fx == 'shuffle' ? 500 : 250;
		while((opts.timeout - opts.speed) < buffer) // sanitize timeout
			opts.timeout += opts.speed;
	}
	if (opts.easing)
		opts.easeIn = opts.easeOut = opts.easing;
	if (!opts.speedIn)
		opts.speedIn = opts.speed;
	if (!opts.speedOut)
		opts.speedOut = opts.speed;

	opts.slideCount = els.length;
	opts.currSlide = opts.lastSlide = first;
	if (opts.random) {
		if (++opts.randomIndex == els.length)
			opts.randomIndex = 0;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else if (opts.backwards)
		opts.nextSlide = opts.startingSlide === 0 ? (els.length-1) : opts.startingSlide-1;
	else
		opts.nextSlide = opts.startingSlide >= (els.length-1) ? 0 : opts.startingSlide+1;

	// run transition init fn
	if (!opts.multiFx) {
		var init = $.fn.cycle.transitions[opts.fx];
		if ($.isFunction(init))
			init($cont, $slides, opts);
		else if (opts.fx != 'custom' && !opts.multiFx) {
			log('unknown transition: ' + opts.fx,'; slideshow terminating');
			return false;
		}
	}

	// fire artificial events
	var e0 = $slides[first];
	if (!opts.skipInitializationCallbacks) {
		if (opts.before.length)
			opts.before[0].apply(e0, [e0, e0, opts, true]);
		if (opts.after.length)
			opts.after[0].apply(e0, [e0, e0, opts, true]);
	}
	if (opts.next)
		$(opts.next).bind(opts.prevNextEvent,function(){return advance(opts,1);});
	if (opts.prev)
		$(opts.prev).bind(opts.prevNextEvent,function(){return advance(opts,0);});
	if (opts.pager || opts.pagerAnchorBuilder)
		buildPager(els,opts);

	exposeAddSlide(opts, els);

	return opts;
}

// save off original opts so we can restore after clearing state
function saveOriginalOpts(opts) {
	opts.original = { before: [], after: [] };
	opts.original.cssBefore = $.extend({}, opts.cssBefore);
	opts.original.cssAfter  = $.extend({}, opts.cssAfter);
	opts.original.animIn	= $.extend({}, opts.animIn);
	opts.original.animOut   = $.extend({}, opts.animOut);
	$.each(opts.before, function() { opts.original.before.push(this); });
	$.each(opts.after,  function() { opts.original.after.push(this); });
}

function supportMultiTransitions(opts) {
	var i, tx, txs = $.fn.cycle.transitions;
	// look for multiple effects
	if (opts.fx.indexOf(',') > 0) {
		opts.multiFx = true;
		opts.fxs = opts.fx.replace(/\s*/g,'').split(',');
		// discard any bogus effect names
		for (i=0; i < opts.fxs.length; i++) {
			var fx = opts.fxs[i];
			tx = txs[fx];
			if (!tx || !txs.hasOwnProperty(fx) || !$.isFunction(tx)) {
				log('discarding unknown transition: ',fx);
				opts.fxs.splice(i,1);
				i--;
			}
		}
		// if we have an empty list then we threw everything away!
		if (!opts.fxs.length) {
			log('No valid transitions named; slideshow terminating.');
			return false;
		}
	}
	else if (opts.fx == 'all') {  // auto-gen the list of transitions
		opts.multiFx = true;
		opts.fxs = [];
		for (var p in txs) {
			if (txs.hasOwnProperty(p)) {
				tx = txs[p];
				if (txs.hasOwnProperty(p) && $.isFunction(tx))
					opts.fxs.push(p);
			}
		}
	}
	if (opts.multiFx && opts.randomizeEffects) {
		// munge the fxs array to make effect selection random
		var r1 = Math.floor(Math.random() * 20) + 30;
		for (i = 0; i < r1; i++) {
			var r2 = Math.floor(Math.random() * opts.fxs.length);
			opts.fxs.push(opts.fxs.splice(r2,1)[0]);
		}
		debug('randomized fx sequence: ',opts.fxs);
	}
	return true;
}

// provide a mechanism for adding slides after the slideshow has started
function exposeAddSlide(opts, els) {
	opts.addSlide = function(newSlide, prepend) {
		var $s = $(newSlide), s = $s[0];
		if (!opts.autostopCount)
			opts.countdown++;
		els[prepend?'unshift':'push'](s);
		if (opts.els)
			opts.els[prepend?'unshift':'push'](s); // shuffle needs this
		opts.slideCount = els.length;

		// add the slide to the random map and resort
		if (opts.random) {
			opts.randomMap.push(opts.slideCount-1);
			opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
		}

		$s.css('position','absolute');
		$s[prepend?'prependTo':'appendTo'](opts.$cont);

		if (prepend) {
			opts.currSlide++;
			opts.nextSlide++;
		}

		if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg)
			clearTypeFix($s);

		if (opts.fit && opts.width)
			$s.width(opts.width);
		if (opts.fit && opts.height && opts.height != 'auto')
			$s.height(opts.height);
		s.cycleH = (opts.fit && opts.height) ? opts.height : $s.height();
		s.cycleW = (opts.fit && opts.width) ? opts.width : $s.width();

		$s.css(opts.cssBefore);

		if (opts.pager || opts.pagerAnchorBuilder)
			$.fn.cycle.createPagerAnchor(els.length-1, s, $(opts.pager), els, opts);

		if ($.isFunction(opts.onAddSlide))
			opts.onAddSlide($s);
		else
			$s.hide(); // default behavior
	};
}

// reset internal state; we do this on every pass in order to support multiple effects
$.fn.cycle.resetState = function(opts, fx) {
	fx = fx || opts.fx;
	opts.before = []; opts.after = [];
	opts.cssBefore = $.extend({}, opts.original.cssBefore);
	opts.cssAfter  = $.extend({}, opts.original.cssAfter);
	opts.animIn	= $.extend({}, opts.original.animIn);
	opts.animOut   = $.extend({}, opts.original.animOut);
	opts.fxFn = null;
	$.each(opts.original.before, function() { opts.before.push(this); });
	$.each(opts.original.after,  function() { opts.after.push(this); });

	// re-init
	var init = $.fn.cycle.transitions[fx];
	if ($.isFunction(init))
		init(opts.$cont, $(opts.elements), opts);
};

// this is the main engine fn, it handles the timeouts, callbacks and slide index mgmt
function go(els, opts, manual, fwd) {
	var p = opts.$cont[0], curr = els[opts.currSlide], next = els[opts.nextSlide];

	// opts.busy is true if we're in the middle of an animation
	if (manual && opts.busy && opts.manualTrump) {
		// let manual transitions requests trump active ones
		debug('manualTrump in go(), stopping active transition');
		$(els).stop(true,true);
		opts.busy = 0;
		clearTimeout(p.cycleTimeout);
	}

	// don't begin another timeout-based transition if there is one active
	if (opts.busy) {
		debug('transition active, ignoring new tx request');
		return;
	}


	// stop cycling if we have an outstanding stop request
	if (p.cycleStop != opts.stopCount || p.cycleTimeout === 0 && !manual)
		return;

	// check to see if we should stop cycling based on autostop options
	if (!manual && !p.cyclePause && !opts.bounce &&
		((opts.autostop && (--opts.countdown <= 0)) ||
		(opts.nowrap && !opts.random && opts.nextSlide < opts.currSlide))) {
		if (opts.end)
			opts.end(opts);
		return;
	}

	// if slideshow is paused, only transition on a manual trigger
	var changed = false;
	if ((manual || !p.cyclePause) && (opts.nextSlide != opts.currSlide)) {
		changed = true;
		var fx = opts.fx;
		// keep trying to get the slide size if we don't have it yet
		curr.cycleH = curr.cycleH || $(curr).height();
		curr.cycleW = curr.cycleW || $(curr).width();
		next.cycleH = next.cycleH || $(next).height();
		next.cycleW = next.cycleW || $(next).width();

		// support multiple transition types
		if (opts.multiFx) {
			if (fwd && (opts.lastFx === undefined || ++opts.lastFx >= opts.fxs.length))
				opts.lastFx = 0;
			else if (!fwd && (opts.lastFx === undefined || --opts.lastFx < 0))
				opts.lastFx = opts.fxs.length - 1;
			fx = opts.fxs[opts.lastFx];
		}

		// one-time fx overrides apply to:  $('div').cycle(3,'zoom');
		if (opts.oneTimeFx) {
			fx = opts.oneTimeFx;
			opts.oneTimeFx = null;
		}

		$.fn.cycle.resetState(opts, fx);

		// run the before callbacks
		if (opts.before.length)
			$.each(opts.before, function(i,o) {
				if (p.cycleStop != opts.stopCount) return;
				o.apply(next, [curr, next, opts, fwd]);
			});

		// stage the after callacks
		var after = function() {
			opts.busy = 0;
			$.each(opts.after, function(i,o) {
				if (p.cycleStop != opts.stopCount) return;
				o.apply(next, [curr, next, opts, fwd]);
			});
			if (!p.cycleStop) {
				// queue next transition
				queueNext();
			}
		};

		debug('tx firing('+fx+'); currSlide: ' + opts.currSlide + '; nextSlide: ' + opts.nextSlide);
		
		// get ready to perform the transition
		opts.busy = 1;
		if (opts.fxFn) // fx function provided?
			opts.fxFn(curr, next, opts, after, fwd, manual && opts.fastOnEvent);
		else if ($.isFunction($.fn.cycle[opts.fx])) // fx plugin ?
			$.fn.cycle[opts.fx](curr, next, opts, after, fwd, manual && opts.fastOnEvent);
		else
			$.fn.cycle.custom(curr, next, opts, after, fwd, manual && opts.fastOnEvent);
	}
	else {
		queueNext();
	}

	if (changed || opts.nextSlide == opts.currSlide) {
		// calculate the next slide
		var roll;
		opts.lastSlide = opts.currSlide;
		if (opts.random) {
			opts.currSlide = opts.nextSlide;
			if (++opts.randomIndex == els.length) {
				opts.randomIndex = 0;
				opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
			}
			opts.nextSlide = opts.randomMap[opts.randomIndex];
			if (opts.nextSlide == opts.currSlide)
				opts.nextSlide = (opts.currSlide == opts.slideCount - 1) ? 0 : opts.currSlide + 1;
		}
		else if (opts.backwards) {
			roll = (opts.nextSlide - 1) < 0;
			if (roll && opts.bounce) {
				opts.backwards = !opts.backwards;
				opts.nextSlide = 1;
				opts.currSlide = 0;
			}
			else {
				opts.nextSlide = roll ? (els.length-1) : opts.nextSlide-1;
				opts.currSlide = roll ? 0 : opts.nextSlide+1;
			}
		}
		else { // sequence
			roll = (opts.nextSlide + 1) == els.length;
			if (roll && opts.bounce) {
				opts.backwards = !opts.backwards;
				opts.nextSlide = els.length-2;
				opts.currSlide = els.length-1;
			}
			else {
				opts.nextSlide = roll ? 0 : opts.nextSlide+1;
				opts.currSlide = roll ? els.length-1 : opts.nextSlide-1;
			}
		}
	}
	if (changed && opts.pager)
		opts.updateActivePagerLink(opts.pager, opts.currSlide, opts.activePagerClass);
	
	function queueNext() {
		// stage the next transition
		var ms = 0, timeout = opts.timeout;
		if (opts.timeout && !opts.continuous) {
			ms = getTimeout(els[opts.currSlide], els[opts.nextSlide], opts, fwd);
         if (opts.fx == 'shuffle')
            ms -= opts.speedOut;
      }
		else if (opts.continuous && p.cyclePause) // continuous shows work off an after callback, not this timer logic
			ms = 10;
		if (ms > 0)
			p.cycleTimeout = setTimeout(function(){ go(els, opts, 0, !opts.backwards); }, ms);
	}
}

// invoked after transition
$.fn.cycle.updateActivePagerLink = function(pager, currSlide, clsName) {
   $(pager).each(function() {
       $(this).children().removeClass(clsName).eq(currSlide).addClass(clsName);
   });
};

// calculate timeout value for current transition
function getTimeout(curr, next, opts, fwd) {
	if (opts.timeoutFn) {
		// call user provided calc fn
		var t = opts.timeoutFn.call(curr,curr,next,opts,fwd);
		while (opts.fx != 'none' && (t - opts.speed) < 250) // sanitize timeout
			t += opts.speed;
		debug('calculated timeout: ' + t + '; speed: ' + opts.speed);
		if (t !== false)
			return t;
	}
	return opts.timeout;
}

// expose next/prev function, caller must pass in state
$.fn.cycle.next = function(opts) { advance(opts,1); };
$.fn.cycle.prev = function(opts) { advance(opts,0);};

// advance slide forward or back
function advance(opts, moveForward) {
	var val = moveForward ? 1 : -1;
	var els = opts.elements;
	var p = opts.$cont[0], timeout = p.cycleTimeout;
	if (timeout) {
		clearTimeout(timeout);
		p.cycleTimeout = 0;
	}
	if (opts.random && val < 0) {
		// move back to the previously display slide
		opts.randomIndex--;
		if (--opts.randomIndex == -2)
			opts.randomIndex = els.length-2;
		else if (opts.randomIndex == -1)
			opts.randomIndex = els.length-1;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else if (opts.random) {
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else {
		opts.nextSlide = opts.currSlide + val;
		if (opts.nextSlide < 0) {
			if (opts.nowrap) return false;
			opts.nextSlide = els.length - 1;
		}
		else if (opts.nextSlide >= els.length) {
			if (opts.nowrap) return false;
			opts.nextSlide = 0;
		}
	}

	var cb = opts.onPrevNextEvent || opts.prevNextClick; // prevNextClick is deprecated
	if ($.isFunction(cb))
		cb(val > 0, opts.nextSlide, els[opts.nextSlide]);
	go(els, opts, 1, moveForward);
	return false;
}

function buildPager(els, opts) {
	var $p = $(opts.pager);
	$.each(els, function(i,o) {
		$.fn.cycle.createPagerAnchor(i,o,$p,els,opts);
	});
	opts.updateActivePagerLink(opts.pager, opts.startingSlide, opts.activePagerClass);
}

$.fn.cycle.createPagerAnchor = function(i, el, $p, els, opts) {
	var a;
	if ($.isFunction(opts.pagerAnchorBuilder)) {
		a = opts.pagerAnchorBuilder(i,el);
		debug('pagerAnchorBuilder('+i+', el) returned: ' + a);
	}
	else
		a = '<a href="#">'+(i+1)+'</a>';
		
	if (!a)
		return;
	var $a = $(a);
	// don't reparent if anchor is in the dom
	if ($a.parents('body').length === 0) {
		var arr = [];
		if ($p.length > 1) {
			$p.each(function() {
				var $clone = $a.clone(true);
				$(this).append($clone);
				arr.push($clone[0]);
			});
			$a = $(arr);
		}
		else {
			$a.appendTo($p);
		}
	}

	opts.pagerAnchors =  opts.pagerAnchors || [];
	opts.pagerAnchors.push($a);
	
	var pagerFn = function(e) {
		e.preventDefault();
		opts.nextSlide = i;
		var p = opts.$cont[0], timeout = p.cycleTimeout;
		if (timeout) {
			clearTimeout(timeout);
			p.cycleTimeout = 0;
		}
		var cb = opts.onPagerEvent || opts.pagerClick; // pagerClick is deprecated
		if ($.isFunction(cb))
			cb(opts.nextSlide, els[opts.nextSlide]);
		go(els,opts,1,opts.currSlide < i); // trigger the trans
//		return false; // <== allow bubble
	};
	
	if ( /mouseenter|mouseover/i.test(opts.pagerEvent) ) {
		$a.hover(pagerFn, function(){/* no-op */} );
	}
	else {
		$a.bind(opts.pagerEvent, pagerFn);
	}
	
	if ( ! /^click/.test(opts.pagerEvent) && !opts.allowPagerClickBubble)
		$a.bind('click.cycle', function(){return false;}); // suppress click
	
	var cont = opts.$cont[0];
	var pauseFlag = false; // https://github.com/malsup/cycle/issues/44
	if (opts.pauseOnPagerHover) {
		$a.hover(
			function() { 
				pauseFlag = true;
				cont.cyclePause++; 
				triggerPause(cont,true,true);
			}, function() { 
				if (pauseFlag)
					cont.cyclePause--; 
				triggerPause(cont,true,true);
			} 
		);
	}
};

// helper fn to calculate the number of slides between the current and the next
$.fn.cycle.hopsFromLast = function(opts, fwd) {
	var hops, l = opts.lastSlide, c = opts.currSlide;
	if (fwd)
		hops = c > l ? c - l : opts.slideCount - l;
	else
		hops = c < l ? l - c : l + opts.slideCount - c;
	return hops;
};

// fix clearType problems in ie6 by setting an explicit bg color
// (otherwise text slides look horrible during a fade transition)
function clearTypeFix($slides) {
	debug('applying clearType background-color hack');
	function hex(s) {
		s = parseInt(s,10).toString(16);
		return s.length < 2 ? '0'+s : s;
	}
	function getBg(e) {
		for ( ; e && e.nodeName.toLowerCase() != 'html'; e = e.parentNode) {
			var v = $.css(e,'background-color');
			if (v && v.indexOf('rgb') >= 0 ) {
				var rgb = v.match(/\d+/g);
				return '#'+ hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
			}
			if (v && v != 'transparent')
				return v;
		}
		return '#ffffff';
	}
	$slides.each(function() { $(this).css('background-color', getBg(this)); });
}

// reset common props before the next transition
$.fn.cycle.commonReset = function(curr,next,opts,w,h,rev) {
	$(opts.elements).not(curr).hide();
	if (typeof opts.cssBefore.opacity == 'undefined')
		opts.cssBefore.opacity = 1;
	opts.cssBefore.display = 'block';
	if (opts.slideResize && w !== false && next.cycleW > 0)
		opts.cssBefore.width = next.cycleW;
	if (opts.slideResize && h !== false && next.cycleH > 0)
		opts.cssBefore.height = next.cycleH;
	opts.cssAfter = opts.cssAfter || {};
	opts.cssAfter.display = 'none';
	$(curr).css('zIndex',opts.slideCount + (rev === true ? 1 : 0));
	$(next).css('zIndex',opts.slideCount + (rev === true ? 0 : 1));
};

// the actual fn for effecting a transition
$.fn.cycle.custom = function(curr, next, opts, cb, fwd, speedOverride) {
	var $l = $(curr), $n = $(next);
	var speedIn = opts.speedIn, speedOut = opts.speedOut, easeIn = opts.easeIn, easeOut = opts.easeOut, animInDelay = opts.animInDelay, animOutDelay = opts.animOutDelay;
	$n.css(opts.cssBefore);
	if (speedOverride) {
		if (typeof speedOverride == 'number')
			speedIn = speedOut = speedOverride;
		else
			speedIn = speedOut = 1;
		easeIn = easeOut = null;
	}
	var fn = function() {
		$n.delay(animInDelay).animate(opts.animIn, speedIn, easeIn, function() {
			cb();
		});
	};
	$l.delay(animOutDelay).animate(opts.animOut, speedOut, easeOut, function() {
		$l.css(opts.cssAfter);
		if (!opts.sync) 
			fn();
	});
	if (opts.sync) fn();
};

// transition definitions - only fade is defined here, transition pack defines the rest
$.fn.cycle.transitions = {
	fade: function($cont, $slides, opts) {
		$slides.not(':eq('+opts.currSlide+')').css('opacity',0);
		opts.before.push(function(curr,next,opts) {
			$.fn.cycle.commonReset(curr,next,opts);
			opts.cssBefore.opacity = 0;
		});
		opts.animIn	   = { opacity: 1 };
		opts.animOut   = { opacity: 0 };
		opts.cssBefore = { top: 0, left: 0 };
	}
};

$.fn.cycle.ver = function() { return ver; };

// override these globally if you like (they are all optional)
$.fn.cycle.defaults = {
    activePagerClass: 'activeSlide', // class name used for the active pager link
    after:            null,     // transition callback (scope set to element that was shown):  function(currSlideElement, nextSlideElement, options, forwardFlag)
    allowPagerClickBubble: false, // allows or prevents click event on pager anchors from bubbling
    animIn:           null,     // properties that define how the slide animates in
    animInDelay:      0,        // allows delay before next slide transitions in	
    animOut:          null,     // properties that define how the slide animates out
    animOutDelay:     0,        // allows delay before current slide transitions out
    aspect:           false,    // preserve aspect ratio during fit resizing, cropping if necessary (must be used with fit option)
    autostop:         0,        // true to end slideshow after X transitions (where X == slide count)
    autostopCount:    0,        // number of transitions (optionally used with autostop to define X)
    backwards:        false,    // true to start slideshow at last slide and move backwards through the stack
    before:           null,     // transition callback (scope set to element to be shown):     function(currSlideElement, nextSlideElement, options, forwardFlag)
    center:           null,     // set to true to have cycle add top/left margin to each slide (use with width and height options)
    cleartype:        !$.support.opacity,  // true if clearType corrections should be applied (for IE)
    cleartypeNoBg:    false,    // set to true to disable extra cleartype fixing (leave false to force background color setting on slides)
    containerResize:  1,        // resize container to fit largest slide
    containerResizeHeight:  0,  // resize containers height to fit the largest slide but leave the width dynamic
    continuous:       0,        // true to start next transition immediately after current one completes
    cssAfter:         null,     // properties that defined the state of the slide after transitioning out
    cssBefore:        null,     // properties that define the initial state of the slide before transitioning in
    delay:            0,        // additional delay (in ms) for first transition (hint: can be negative)
    easeIn:           null,     // easing for "in" transition
    easeOut:          null,     // easing for "out" transition
    easing:           null,     // easing method for both in and out transitions
    end:              null,     // callback invoked when the slideshow terminates (use with autostop or nowrap options): function(options)
    fastOnEvent:      0,        // force fast transitions when triggered manually (via pager or prev/next); value == time in ms
    fit:              0,        // force slides to fit container
    fx:               'fade',   // name of transition effect (or comma separated names, ex: 'fade,scrollUp,shuffle')
    fxFn:             null,     // function used to control the transition: function(currSlideElement, nextSlideElement, options, afterCalback, forwardFlag)
    height:           'auto',   // container height (if the 'fit' option is true, the slides will be set to this height as well)
    manualTrump:      true,     // causes manual transition to stop an active transition instead of being ignored
    metaAttr:         'cycle',  // data- attribute that holds the option data for the slideshow
    next:             null,     // element, jQuery object, or jQuery selector string for the element to use as event trigger for next slide
    nowrap:           0,        // true to prevent slideshow from wrapping
    onPagerEvent:     null,     // callback fn for pager events: function(zeroBasedSlideIndex, slideElement)
    onPrevNextEvent:  null,     // callback fn for prev/next events: function(isNext, zeroBasedSlideIndex, slideElement)
    pager:            null,     // element, jQuery object, or jQuery selector string for the element to use as pager container
    pagerAnchorBuilder: null,   // callback fn for building anchor links:  function(index, DOMelement)
    pagerEvent:       'click.cycle', // name of event which drives the pager navigation
    pause:            0,        // true to enable "pause on hover"
    pauseOnPagerHover: 0,       // true to pause when hovering over pager link
    prev:             null,     // element, jQuery object, or jQuery selector string for the element to use as event trigger for previous slide
    prevNextEvent:    'click.cycle',// event which drives the manual transition to the previous or next slide
    random:           0,        // true for random, false for sequence (not applicable to shuffle fx)
    randomizeEffects: 1,        // valid when multiple effects are used; true to make the effect sequence random
    requeueOnImageNotLoaded: true, // requeue the slideshow if any image slides are not yet loaded
    requeueTimeout:   250,      // ms delay for requeue
    rev:              0,        // causes animations to transition in reverse (for effects that support it such as scrollHorz/scrollVert/shuffle)
    shuffle:          null,     // coords for shuffle animation, ex: { top:15, left: 200 }
    skipInitializationCallbacks: false, // set to true to disable the first before/after callback that occurs prior to any transition
    slideExpr:        null,     // expression for selecting slides (if something other than all children is required)
    slideResize:      1,        // force slide width/height to fixed size before every transition
    speed:            1000,     // speed of the transition (any valid fx speed value)
    speedIn:          null,     // speed of the 'in' transition
    speedOut:         null,     // speed of the 'out' transition
    startingSlide:    undefined,// zero-based index of the first slide to be displayed
    sync:             1,        // true if in/out transitions should occur simultaneously
    timeout:          4000,     // milliseconds between slide transitions (0 to disable auto advance)
    timeoutFn:        null,     // callback for determining per-slide timeout value:  function(currSlideElement, nextSlideElement, options, forwardFlag)
    updateActivePagerLink: null,// callback fn invoked to update the active pager link (adds/removes activePagerClass style)
    width:            null      // container width (if the 'fit' option is true, the slides will be set to this width as well)
};

})(jQuery);


/*!
 * jQuery Cycle Plugin Transition Definitions
 * This script is a plugin for the jQuery Cycle Plugin
 * Examples and documentation at: http://malsup.com/jquery/cycle/
 * Copyright (c) 2007-2010 M. Alsup
 * Version:	 2.73
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
(function($) {
"use strict";

//
// These functions define slide initialization and properties for the named
// transitions. To save file size feel free to remove any of these that you
// don't need.
//
$.fn.cycle.transitions.none = function($cont, $slides, opts) {
	opts.fxFn = function(curr,next,opts,after){
		$(next).show();
		$(curr).hide();
		after();
	};
};

// not a cross-fade, fadeout only fades out the top slide
$.fn.cycle.transitions.fadeout = function($cont, $slides, opts) {
	$slides.not(':eq('+opts.currSlide+')').css({ display: 'block', 'opacity': 1 });
	opts.before.push(function(curr,next,opts,w,h,rev) {
		$(curr).css('zIndex',opts.slideCount + (rev !== true ? 1 : 0));
		$(next).css('zIndex',opts.slideCount + (rev !== true ? 0 : 1));
	});
	opts.animIn.opacity = 1;
	opts.animOut.opacity = 0;
	opts.cssBefore.opacity = 1;
	opts.cssBefore.display = 'block';
	opts.cssAfter.zIndex = 0;
};

// scrollUp/Down/Left/Right
$.fn.cycle.transitions.scrollUp = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var h = $cont.height();
	opts.cssBefore.top = h;
	opts.cssBefore.left = 0;
	opts.cssFirst.top = 0;
	opts.animIn.top = 0;
	opts.animOut.top = -h;
};
$.fn.cycle.transitions.scrollDown = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var h = $cont.height();
	opts.cssFirst.top = 0;
	opts.cssBefore.top = -h;
	opts.cssBefore.left = 0;
	opts.animIn.top = 0;
	opts.animOut.top = h;
};
$.fn.cycle.transitions.scrollLeft = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var w = $cont.width();
	opts.cssFirst.left = 0;
	opts.cssBefore.left = w;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.left = 0-w;
};
$.fn.cycle.transitions.scrollRight = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var w = $cont.width();
	opts.cssFirst.left = 0;
	opts.cssBefore.left = -w;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.left = w;
};
$.fn.cycle.transitions.scrollHorz = function($cont, $slides, opts) {
	$cont.css('overflow','hidden').width();
	opts.before.push(function(curr, next, opts, fwd) {
		if (opts.rev)
			fwd = !fwd;
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssBefore.left = fwd ? (next.cycleW-1) : (1-next.cycleW);
		opts.animOut.left = fwd ? -curr.cycleW : curr.cycleW;
	});
	opts.cssFirst.left = 0;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.top = 0;
};
$.fn.cycle.transitions.scrollVert = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push(function(curr, next, opts, fwd) {
		if (opts.rev)
			fwd = !fwd;
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssBefore.top = fwd ? (1-next.cycleH) : (next.cycleH-1);
		opts.animOut.top = fwd ? curr.cycleH : -curr.cycleH;
	});
	opts.cssFirst.top = 0;
	opts.cssBefore.left = 0;
	opts.animIn.top = 0;
	opts.animOut.left = 0;
};

// slideX/slideY
$.fn.cycle.transitions.slideX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$(opts.elements).not(curr).hide();
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.animIn.width = next.cycleW;
	});
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
	opts.animIn.width = 'show';
	opts.animOut.width = 0;
};
$.fn.cycle.transitions.slideY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$(opts.elements).not(curr).hide();
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.animIn.height = next.cycleH;
	});
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.height = 0;
	opts.animIn.height = 'show';
	opts.animOut.height = 0;
};

// shuffle
$.fn.cycle.transitions.shuffle = function($cont, $slides, opts) {
	var i, w = $cont.css('overflow', 'visible').width();
	$slides.css({left: 0, top: 0});
	opts.before.push(function(curr,next,opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
	});
	// only adjust speed once!
	if (!opts.speedAdjusted) {
		opts.speed = opts.speed / 2; // shuffle has 2 transitions
		opts.speedAdjusted = true;
	}
	opts.random = 0;
	opts.shuffle = opts.shuffle || {left:-w, top:15};
	opts.els = [];
	for (i=0; i < $slides.length; i++)
		opts.els.push($slides[i]);

	for (i=0; i < opts.currSlide; i++)
		opts.els.push(opts.els.shift());

	// custom transition fn (hat tip to Benjamin Sterling for this bit of sweetness!)
	opts.fxFn = function(curr, next, opts, cb, fwd) {
		if (opts.rev)
			fwd = !fwd;
		var $el = fwd ? $(curr) : $(next);
		$(next).css(opts.cssBefore);
		var count = opts.slideCount;
		$el.animate(opts.shuffle, opts.speedIn, opts.easeIn, function() {
			var hops = $.fn.cycle.hopsFromLast(opts, fwd);
			for (var k=0; k < hops; k++) {
				if (fwd)
					opts.els.push(opts.els.shift());
				else
					opts.els.unshift(opts.els.pop());
			}
			if (fwd) {
				for (var i=0, len=opts.els.length; i < len; i++)
					$(opts.els[i]).css('z-index', len-i+count);
			}
			else {
				var z = $(curr).css('z-index');
				$el.css('z-index', parseInt(z,10)+1+count);
			}
			$el.animate({left:0, top:0}, opts.speedOut, opts.easeOut, function() {
				$(fwd ? this : curr).hide();
				if (cb) cb();
			});
		});
	};
	$.extend(opts.cssBefore, { display: 'block', opacity: 1, top: 0, left: 0 });
};

// turnUp/Down/Left/Right
$.fn.cycle.transitions.turnUp = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.cssBefore.top = next.cycleH;
		opts.animIn.height = next.cycleH;
		opts.animOut.width = next.cycleW;
	});
	opts.cssFirst.top = 0;
	opts.cssBefore.left = 0;
	opts.cssBefore.height = 0;
	opts.animIn.top = 0;
	opts.animOut.height = 0;
};
$.fn.cycle.transitions.turnDown = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssFirst.top = 0;
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.height = 0;
	opts.animOut.height = 0;
};
$.fn.cycle.transitions.turnLeft = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.cssBefore.left = next.cycleW;
		opts.animIn.width = next.cycleW;
	});
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
	opts.animIn.left = 0;
	opts.animOut.width = 0;
};
$.fn.cycle.transitions.turnRight = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.animIn.width = next.cycleW;
		opts.animOut.left = curr.cycleW;
	});
	$.extend(opts.cssBefore, { top: 0, left: 0, width: 0 });
	opts.animIn.left = 0;
	opts.animOut.width = 0;
};

// zoom
$.fn.cycle.transitions.zoom = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,false,true);
		opts.cssBefore.top = next.cycleH/2;
		opts.cssBefore.left = next.cycleW/2;
		$.extend(opts.animIn, { top: 0, left: 0, width: next.cycleW, height: next.cycleH });
		$.extend(opts.animOut, { width: 0, height: 0, top: curr.cycleH/2, left: curr.cycleW/2 });
	});
	opts.cssFirst.top = 0;
	opts.cssFirst.left = 0;
	opts.cssBefore.width = 0;
	opts.cssBefore.height = 0;
};

// fadeZoom
$.fn.cycle.transitions.fadeZoom = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,false);
		opts.cssBefore.left = next.cycleW/2;
		opts.cssBefore.top = next.cycleH/2;
		$.extend(opts.animIn, { top: 0, left: 0, width: next.cycleW, height: next.cycleH });
	});
	opts.cssBefore.width = 0;
	opts.cssBefore.height = 0;
	opts.animOut.opacity = 0;
};

// blindX
$.fn.cycle.transitions.blindX = function($cont, $slides, opts) {
	var w = $cont.css('overflow','hidden').width();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.width = next.cycleW;
		opts.animOut.left   = curr.cycleW;
	});
	opts.cssBefore.left = w;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.left = w;
};
// blindY
$.fn.cycle.transitions.blindY = function($cont, $slides, opts) {
	var h = $cont.css('overflow','hidden').height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssBefore.top = h;
	opts.cssBefore.left = 0;
	opts.animIn.top = 0;
	opts.animOut.top = h;
};
// blindZ
$.fn.cycle.transitions.blindZ = function($cont, $slides, opts) {
	var h = $cont.css('overflow','hidden').height();
	var w = $cont.width();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssBefore.top = h;
	opts.cssBefore.left = w;
	opts.animIn.top = 0;
	opts.animIn.left = 0;
	opts.animOut.top = h;
	opts.animOut.left = w;
};

// growX - grow horizontally from centered 0 width
$.fn.cycle.transitions.growX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.cssBefore.left = this.cycleW/2;
		opts.animIn.left = 0;
		opts.animIn.width = this.cycleW;
		opts.animOut.left = 0;
	});
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
};
// growY - grow vertically from centered 0 height
$.fn.cycle.transitions.growY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.cssBefore.top = this.cycleH/2;
		opts.animIn.top = 0;
		opts.animIn.height = this.cycleH;
		opts.animOut.top = 0;
	});
	opts.cssBefore.height = 0;
	opts.cssBefore.left = 0;
};

// curtainX - squeeze in both edges horizontally
$.fn.cycle.transitions.curtainX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true,true);
		opts.cssBefore.left = next.cycleW/2;
		opts.animIn.left = 0;
		opts.animIn.width = this.cycleW;
		opts.animOut.left = curr.cycleW/2;
		opts.animOut.width = 0;
	});
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
};
// curtainY - squeeze in both edges vertically
$.fn.cycle.transitions.curtainY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false,true);
		opts.cssBefore.top = next.cycleH/2;
		opts.animIn.top = 0;
		opts.animIn.height = next.cycleH;
		opts.animOut.top = curr.cycleH/2;
		opts.animOut.height = 0;
	});
	opts.cssBefore.height = 0;
	opts.cssBefore.left = 0;
};

// cover - curr slide covered by next slide
$.fn.cycle.transitions.cover = function($cont, $slides, opts) {
	var d = opts.direction || 'left';
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssAfter.display = '';
		if (d == 'right')
			opts.cssBefore.left = -w;
		else if (d == 'up')
			opts.cssBefore.top = h;
		else if (d == 'down')
			opts.cssBefore.top = -h;
		else
			opts.cssBefore.left = w;
	});
	opts.animIn.left = 0;
	opts.animIn.top = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.left = 0;
};

// uncover - curr slide moves off next slide
$.fn.cycle.transitions.uncover = function($cont, $slides, opts) {
	var d = opts.direction || 'left';
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
		if (d == 'right')
			opts.animOut.left = w;
		else if (d == 'up')
			opts.animOut.top = -h;
		else if (d == 'down')
			opts.animOut.top = h;
		else
			opts.animOut.left = -w;
	});
	opts.animIn.left = 0;
	opts.animIn.top = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.left = 0;
};

// toss - move top slide and fade away
$.fn.cycle.transitions.toss = function($cont, $slides, opts) {
	var w = $cont.css('overflow','visible').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
		// provide default toss settings if animOut not provided
		if (!opts.animOut.left && !opts.animOut.top)
			$.extend(opts.animOut, { left: w*2, top: -h/2, opacity: 0 });
		else
			opts.animOut.opacity = 0;
	});
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
};

// wipe - clip animation
$.fn.cycle.transitions.wipe = function($cont, $slides, opts) {
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.cssBefore = opts.cssBefore || {};
	var clip;
	if (opts.clip) {
		if (/l2r/.test(opts.clip))
			clip = 'rect(0px 0px '+h+'px 0px)';
		else if (/r2l/.test(opts.clip))
			clip = 'rect(0px '+w+'px '+h+'px '+w+'px)';
		else if (/t2b/.test(opts.clip))
			clip = 'rect(0px '+w+'px 0px 0px)';
		else if (/b2t/.test(opts.clip))
			clip = 'rect('+h+'px '+w+'px '+h+'px 0px)';
		else if (/zoom/.test(opts.clip)) {
			var top = parseInt(h/2,10);
			var left = parseInt(w/2,10);
			clip = 'rect('+top+'px '+left+'px '+top+'px '+left+'px)';
		}
	}

	opts.cssBefore.clip = opts.cssBefore.clip || clip || 'rect(0px 0px 0px 0px)';

	var d = opts.cssBefore.clip.match(/(\d+)/g);
	var t = parseInt(d[0],10), r = parseInt(d[1],10), b = parseInt(d[2],10), l = parseInt(d[3],10);

	opts.before.push(function(curr, next, opts) {
		if (curr == next) return;
		var $curr = $(curr), $next = $(next);
		$.fn.cycle.commonReset(curr,next,opts,true,true,false);
		opts.cssAfter.display = 'block';

		var step = 1, count = parseInt((opts.speedIn / 13),10) - 1;
		(function f() {
			var tt = t ? t - parseInt(step * (t/count),10) : 0;
			var ll = l ? l - parseInt(step * (l/count),10) : 0;
			var bb = b < h ? b + parseInt(step * ((h-b)/count || 1),10) : h;
			var rr = r < w ? r + parseInt(step * ((w-r)/count || 1),10) : w;
			$next.css({ clip: 'rect('+tt+'px '+rr+'px '+bb+'px '+ll+'px)' });
			(step++ <= count) ? setTimeout(f, 13) : $curr.css('display', 'none');
		})();
	});
	$.extend(opts.cssBefore, { display: 'block', opacity: 1, top: 0, left: 0 });
	opts.animIn	   = { left: 0 };
	opts.animOut   = { left: 0 };
};

})(jQuery);
;

/**
 *  @file
 *  A simple jQuery Cycle Div Slideshow Rotator.
 */

/**
 * This will set our initial behavior, by starting up each individual slideshow.
 */
(function ($) {
  Drupal.behaviors.viewsSlideshowCycle = {
    attach: function (context) {
      $('.views_slideshow_cycle_main:not(.viewsSlideshowCycle-processed)', context).addClass('viewsSlideshowCycle-processed').each(function() {
        var fullId = '#' + $(this).attr('id');
        var settings = Drupal.settings.viewsSlideshowCycle[fullId];
        settings.targetId = '#' + $(fullId + " :first").attr('id');

        settings.slideshowId = settings.targetId.replace('#views_slideshow_cycle_teaser_section_', '');
        // Pager after function.
        var pager_after_fn = function(curr, next, opts) {
          // Need to do some special handling on first load.
          var slideNum = opts.currSlide;
          if (typeof settings.processedAfter == 'undefined' || !settings.processedAfter) {
            settings.processedAfter = 1;
            slideNum = (typeof settings.opts.startingSlide == 'undefined') ? 0 : settings.opts.startingSlide;
          }
          Drupal.viewsSlideshow.action({ "action": 'transitionEnd', "slideshowID": settings.slideshowId, "slideNum": slideNum });
        }
        // Pager before function.
        var pager_before_fn = function(curr, next, opts) {
          var slideNum = opts.nextSlide;

          // Remember last slide.
          if (settings.remember_slide) {
            createCookie(settings.vss_id, slideNum, settings.remember_slide_days);
          }

          // Make variable height.
          if (!settings.fixed_height) {
            //get the height of the current slide
            var $ht = $(next).height();
            //set the container's height to that of the current slide
            $(next).parent().animate({height: $ht});
          }

          // Need to do some special handling on first load.
          if (typeof settings.processedBefore == 'undefined' || !settings.processedBefore) {
            settings.processedBefore = 1;
            slideNum = (typeof opts.startingSlide == 'undefined') ? 0 : opts.startingSlide;
          }

          Drupal.viewsSlideshow.action({ "action": 'transitionBegin', "slideshowID": settings.slideshowId, "slideNum": slideNum });
        }
        settings.loaded = false;

        settings.opts = {
          speed:settings.speed,
          timeout:settings.timeout,
          delay:settings.delay,
          sync:settings.sync,
          random:settings.random,
          nowrap:settings.nowrap,
          after:pager_after_fn,
          before:pager_before_fn,
          cleartype:(settings.cleartype)? true : false,
          cleartypeNoBg:(settings.cleartypenobg)? true : false
        }

        // Set the starting slide if we are supposed to remember the slide
        if (settings.remember_slide) {
          var startSlide = readCookie(settings.vss_id);
          if (startSlide == null) {
            startSlide = 0;
          }
          settings.opts.startingSlide = parseInt(startSlide);
        }

        if (settings.effect == 'none') {
          settings.opts.speed = 1;
        }
        else {
          settings.opts.fx = settings.effect;
        }

        // Take starting item from fragment.
        var hash = location.hash;
        if (hash) {
          var hash = hash.replace('#', '');
          var aHash = hash.split(';');
          var aHashLen = aHash.length;

          // Loop through all the possible starting points.
          for (var i = 0; i < aHashLen; i++) {
            // Split the hash into two parts. One part is the slideshow id the
            // other is the slide number.
            var initialInfo = aHash[i].split(':');
            // The id in the hash should match our slideshow.
            // The slide number chosen shouldn't be larger than the number of
            // slides we have.
            if (settings.slideshowId == initialInfo[0] && settings.num_divs > initialInfo[1]) {
              settings.opts.startingSlide = parseInt(initialInfo[1]);
            }
          }
        }

        // Pause on hover.
        if (settings.pause) {
          var mouseIn = function() {
            Drupal.viewsSlideshow.action({ "action": 'pause', "slideshowID": settings.slideshowId });
          }

          var mouseOut = function() {
            Drupal.viewsSlideshow.action({ "action": 'play', "slideshowID": settings.slideshowId });
          }

          if (jQuery.fn.hoverIntent) {
            $('#views_slideshow_cycle_teaser_section_' + settings.vss_id).hoverIntent(mouseIn, mouseOut);
          }
          else {
            $('#views_slideshow_cycle_teaser_section_' + settings.vss_id).hover(mouseIn, mouseOut);
          }
        }

        // Pause on clicking of the slide.
        if (settings.pause_on_click) {
          $('#views_slideshow_cycle_teaser_section_' + settings.vss_id).click(function() {
            Drupal.viewsSlideshow.action({ "action": 'pause', "slideshowID": settings.slideshowId, "force": true });
          });
        }

        if (typeof JSON != 'undefined') {
          var advancedOptions = JSON.parse(settings.advanced_options);
          for (var option in advancedOptions) {
            switch(option) {

              // Standard Options
              case "activePagerClass":
              case "allowPagerClickBubble":
              case "autostop":
              case "autostopCount":
              case "backwards":
              case "bounce":
              case "cleartype":
              case "cleartypeNoBg":
              case "containerResize":
              case "continuous":
              case "delay":
              case "easeIn":
              case "easeOut":
              case "easing":
              case "fastOnEvent":
              case "fit":
              case "fx":
              case "height":
              case "manualTrump":
              case "metaAttr":
              case "next":
              case "nowrap":
              case "pager":
              case "pagerEvent":
              case "pause":
              case "pauseOnPagerHover":
              case "prev":
              case "prevNextEvent":
              case "random":
              case "randomizeEffects":
              case "requeueOnImageNotLoaded":
              case "requeueTimeout":
              case "rev":
              case "slideExpr":
              case "slideResize":
              case "speed":
              case "speedIn":
              case "speedOut":
              case "startingSlide":
              case "sync":
              case "timeout":
              case "width":
                var optionValue = advancedOptions[option];
                optionValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(optionValue);
                settings.opts[option] = optionValue;
                break;

              // These process options that look like {top:50, bottom:20}
              case "animIn":
              case "animOut":
              case "cssBefore":
              case "cssAfter":
              case "shuffle":
                var cssValue = advancedOptions[option];
                cssValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(cssValue);
                settings.opts[option] = eval('(' + cssValue + ')');
                break;

              // These options have their own functions.
              case "after":
                var afterValue = advancedOptions[option];
                afterValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(afterValue);
                // transition callback (scope set to element that was shown): function(currSlideElement, nextSlideElement, options, forwardFlag)
                settings.opts[option] = function(currSlideElement, nextSlideElement, options, forwardFlag) {
                  pager_after_fn(currSlideElement, nextSlideElement, options);
                  eval(afterValue);
                }
                break;

              case "before":
                var beforeValue = advancedOptions[option];
                beforeValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(beforeValue);
                // transition callback (scope set to element to be shown):     function(currSlideElement, nextSlideElement, options, forwardFlag)
                settings.opts[option] = function(currSlideElement, nextSlideElement, options, forwardFlag) {
                  pager_before_fn(currSlideElement, nextSlideElement, options);
                  eval(beforeValue);
                }
                break;

              case "end":
                var endValue = advancedOptions[option];
                endValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(endValue);
                // callback invoked when the slideshow terminates (use with autostop or nowrap options): function(options)
                settings.opts[option] = function(options) {
                  eval(endValue);
                }
                break;

              case "fxFn":
                var fxFnValue = advancedOptions[option];
                fxFnValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(fxFnValue);
                // function used to control the transition: function(currSlideElement, nextSlideElement, options, afterCalback, forwardFlag)
                settings.opts[option] = function(currSlideElement, nextSlideElement, options, afterCalback, forwardFlag) {
                  eval(fxFnValue);
                }
                break;

              case "onPagerEvent":
                var onPagerEventValue = advancedOptions[option];
                onPagerEventValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(onPagerEventValue);
                settings.opts[option] = function(zeroBasedSlideIndex, slideElement) {
                  eval(onPagerEventValue);
                }
                break;

              case "onPrevNextEvent":
                var onPrevNextEventValue = advancedOptions[option];
                onPrevNextEventValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(onPrevNextEventValue);
                settings.opts[option] = function(isNext, zeroBasedSlideIndex, slideElement) {
                  eval(onPrevNextEventValue);
                }
                break;

              case "pagerAnchorBuilder":
                var pagerAnchorBuilderValue = advancedOptions[option];
                pagerAnchorBuilderValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(pagerAnchorBuilderValue);
                // callback fn for building anchor links:  function(index, DOMelement)
                settings.opts[option] = function(index, DOMelement) {
                  var returnVal = '';
                  eval(pagerAnchorBuilderValue);
                  return returnVal;
                }
                break;

              case "pagerClick":
                var pagerClickValue = advancedOptions[option];
                pagerClickValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(pagerClickValue);
                // callback fn for pager clicks:    function(zeroBasedSlideIndex, slideElement)
                settings.opts[option] = function(zeroBasedSlideIndex, slideElement) {
                  eval(pagerClickValue);
                }
                break;

              case "paused":
                var pausedValue = advancedOptions[option];
                pausedValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(pausedValue);
                // undocumented callback when slideshow is paused:    function(cont, opts, byHover)
                settings.opts[option] = function(cont, opts, byHover) {
                  eval(pausedValue);
                }
                break;

              case "resumed":
                var resumedValue = advancedOptions[option];
                resumedValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(resumedValue);
                // undocumented callback when slideshow is resumed:    function(cont, opts, byHover)
                settings.opts[option] = function(cont, opts, byHover) {
                  eval(resumedValue);
                }
                break;

              case "timeoutFn":
                var timeoutFnValue = advancedOptions[option];
                timeoutFnValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(timeoutFnValue);
                settings.opts[option] = function(currSlideElement, nextSlideElement, options, forwardFlag) {
                  eval(timeoutFnValue);
                }
                break;

              case "updateActivePagerLink":
                var updateActivePagerLinkValue = advancedOptions[option];
                updateActivePagerLinkValue = Drupal.viewsSlideshowCycle.advancedOptionCleanup(updateActivePagerLinkValue);
                // callback fn invoked to update the active pager link (adds/removes activePagerClass style)
                settings.opts[option] = function(pager, currSlideIndex) {
                  eval(updateActivePagerLinkValue);
                }
                break;
            }
          }
        }

        // If selected wait for the images to be loaded.
        // otherwise just load the slideshow.
        if (settings.wait_for_image_load) {
          // For IE/Chrome/Opera we if there are images then we need to make
          // sure the images are loaded before starting the slideshow.
          settings.totalImages = $(settings.targetId + ' img').length;
          if (settings.totalImages) {
            settings.loadedImages = 0;

            // Add a load event for each image.
            $(settings.targetId + ' img').each(function() {
              var $imageElement = $(this);
              $imageElement.bind('load', function () {
                Drupal.viewsSlideshowCycle.imageWait(fullId);
              });

              // Removing the source and adding it again will fire the load event.
              var imgSrc = $imageElement.attr('src');
              $imageElement.attr('src', '');
              $imageElement.attr('src', imgSrc);
            });

            // We need to set a timeout so that the slideshow doesn't wait
            // indefinitely for all images to load.
            setTimeout("Drupal.viewsSlideshowCycle.load('" + fullId + "')", settings.wait_for_image_load_timeout);
          }
          else {
            Drupal.viewsSlideshowCycle.load(fullId);
          }
        }
        else {
          Drupal.viewsSlideshowCycle.load(fullId);
        }
      });
    }
  };

  Drupal.viewsSlideshowCycle = Drupal.viewsSlideshowCycle || {};

  // Cleanup the values of advanced options.
  Drupal.viewsSlideshowCycle.advancedOptionCleanup = function(value) {
    value = $.trim(value);
    value = value.replace(/\n/g, '');
    if (!isNaN(parseInt(value))) {
      value = parseInt(value);
    }
    else if (value.toLowerCase() == 'true') {
      value = true;
    }
    else if (value.toLowerCase() == 'false') {
      value = false;
    }

    return value;
  }

  // This checks to see if all the images have been loaded.
  // If they have then it starts the slideshow.
  Drupal.viewsSlideshowCycle.imageWait = function(fullId) {
    if (++Drupal.settings.viewsSlideshowCycle[fullId].loadedImages == Drupal.settings.viewsSlideshowCycle[fullId].totalImages) {
      Drupal.viewsSlideshowCycle.load(fullId);
    }
  };

  // Start the slideshow.
  Drupal.viewsSlideshowCycle.load = function (fullId) {
    var settings = Drupal.settings.viewsSlideshowCycle[fullId];

    // Make sure the slideshow isn't already loaded.
    if (!settings.loaded) {
      $(settings.targetId).cycle(settings.opts);
      settings.loaded = true;

      // Start Paused
      if (settings.start_paused) {
        Drupal.viewsSlideshow.action({ "action": 'pause', "slideshowID": settings.slideshowId, "force": true });
      }

      // Pause if hidden.
      if (settings.pause_when_hidden) {
        var checkPause = function(settings) {
          // If the slideshow is visible and it is paused then resume.
          // otherwise if the slideshow is not visible and it is not paused then
          // pause it.
          var visible = viewsSlideshowCycleIsVisible(settings.targetId, settings.pause_when_hidden_type, settings.amount_allowed_visible);
          if (visible) {
            Drupal.viewsSlideshow.action({ "action": 'play', "slideshowID": settings.slideshowId });
          }
          else {
            Drupal.viewsSlideshow.action({ "action": 'pause', "slideshowID": settings.slideshowId });
          }
        }

        // Check when scrolled.
        $(window).scroll(function() {
         checkPause(settings);
        });

        // Check when the window is resized.
        $(window).resize(function() {
          checkPause(settings);
        });
      }
    }
  };

  Drupal.viewsSlideshowCycle.pause = function (options) {
    //Eat TypeError, cycle doesn't handle pause well if options isn't defined.
    try{
      if (options.pause_in_middle && $.fn.pause) {
        $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).pause();
      }
      else {
        $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).cycle('pause');
      }
    }
    catch(e){
      if(!e instanceof TypeError){
        throw e;
      }
    }
  };

  Drupal.viewsSlideshowCycle.play = function (options) {
    Drupal.settings.viewsSlideshowCycle['#views_slideshow_cycle_main_' + options.slideshowID].paused = false;
    if (options.pause_in_middle && $.fn.resume) {
      $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).resume();
    }
    else {
      $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).cycle('resume');
    }
  };

  Drupal.viewsSlideshowCycle.previousSlide = function (options) {
    $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).cycle('prev');
  };

  Drupal.viewsSlideshowCycle.nextSlide = function (options) {
    $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).cycle('next');
  };

  Drupal.viewsSlideshowCycle.goToSlide = function (options) {
    $('#views_slideshow_cycle_teaser_section_' + options.slideshowID).cycle(options.slideNum);
  };

  // Verify that the value is a number.
  function IsNumeric(sText) {
    var ValidChars = "0123456789";
    var IsNumber=true;
    var Char;

    for (var i=0; i < sText.length && IsNumber == true; i++) {
      Char = sText.charAt(i);
      if (ValidChars.indexOf(Char) == -1) {
        IsNumber = false;
      }
    }
    return IsNumber;
  }

  /**
   * Cookie Handling Functions
   */
  function createCookie(name,value,days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else {
      var expires = "";
    }
    document.cookie = name+"="+value+expires+"; path=/";
  }

  function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) {
        return c.substring(nameEQ.length,c.length);
      }
    }
    return null;
  }

  function eraseCookie(name) {
    createCookie(name,"",-1);
  }

  /**
   * Checks to see if the slide is visible enough.
   * elem = element to check.
   * type = The way to calculate how much is visible.
   * amountVisible = amount that should be visible. Either in percent or px. If
   *                it's not defined then all of the slide must be visible.
   *
   * Returns true or false
   */
  function viewsSlideshowCycleIsVisible(elem, type, amountVisible) {
    // Get the top and bottom of the window;
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var docViewLeft = $(window).scrollLeft();
    var docViewRight = docViewLeft + $(window).width();

    // Get the top, bottom, and height of the slide;
    var elemTop = $(elem).offset().top;
    var elemHeight = $(elem).height();
    var elemBottom = elemTop + elemHeight;
    var elemLeft = $(elem).offset().left;
    var elemWidth = $(elem).width();
    var elemRight = elemLeft + elemWidth;
    var elemArea = elemHeight * elemWidth;

    // Calculate what's hiding in the slide.
    var missingLeft = 0;
    var missingRight = 0;
    var missingTop = 0;
    var missingBottom = 0;

    // Find out how much of the slide is missing from the left.
    if (elemLeft < docViewLeft) {
      missingLeft = docViewLeft - elemLeft;
    }

    // Find out how much of the slide is missing from the right.
    if (elemRight > docViewRight) {
      missingRight = elemRight - docViewRight;
    }

    // Find out how much of the slide is missing from the top.
    if (elemTop < docViewTop) {
      missingTop = docViewTop - elemTop;
    }

    // Find out how much of the slide is missing from the bottom.
    if (elemBottom > docViewBottom) {
      missingBottom = elemBottom - docViewBottom;
    }

    // If there is no amountVisible defined then check to see if the whole slide
    // is visible.
    if (type == 'full') {
      return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom)
      && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop)
      && (elemLeft >= docViewLeft) && (elemRight <= docViewRight)
      && (elemLeft <= docViewRight) && (elemRight >= docViewLeft));
    }
    else if(type == 'vertical') {
      var verticalShowing = elemHeight - missingTop - missingBottom;

      // If user specified a percentage then find out if the current shown percent
      // is larger than the allowed percent.
      // Otherwise check to see if the amount of px shown is larger than the
      // allotted amount.
      if (amountVisible.indexOf('%')) {
        return (((verticalShowing/elemHeight)*100) >= parseInt(amountVisible));
      }
      else {
        return (verticalShowing >= parseInt(amountVisible));
      }
    }
    else if(type == 'horizontal') {
      var horizontalShowing = elemWidth - missingLeft - missingRight;

      // If user specified a percentage then find out if the current shown percent
      // is larger than the allowed percent.
      // Otherwise check to see if the amount of px shown is larger than the
      // allotted amount.
      if (amountVisible.indexOf('%')) {
        return (((horizontalShowing/elemWidth)*100) >= parseInt(amountVisible));
      }
      else {
        return (horizontalShowing >= parseInt(amountVisible));
      }
    }
    else if(type == 'area') {
      var areaShowing = (elemWidth - missingLeft - missingRight) * (elemHeight - missingTop - missingBottom);

      // If user specified a percentage then find out if the current shown percent
      // is larger than the allowed percent.
      // Otherwise check to see if the amount of px shown is larger than the
      // allotted amount.
      if (amountVisible.indexOf('%')) {
        return (((areaShowing/elemArea)*100) >= parseInt(amountVisible));
      }
      else {
        return (areaShowing >= parseInt(amountVisible));
      }
    }
  }
})(jQuery);
;
/**
 * @file
 * Some basic behaviors and utility functions for Views.
 */
(function ($) {

Drupal.Views = {};

/**
 * jQuery UI tabs, Views integration component
 */
Drupal.behaviors.viewsTabs = {
  attach: function (context) {
    if ($.viewsUi && $.viewsUi.tabs) {
      $('#views-tabset').once('views-processed').viewsTabs({
        selectedClass: 'active'
      });
    }

    $('a.views-remove-link').once('views-processed').click(function(event) {
      var id = $(this).attr('id').replace('views-remove-link-', '');
      $('#views-row-' + id).hide();
      $('#views-removed-' + id).attr('checked', true);
      event.preventDefault();
   });
  /**
    * Here is to handle display deletion
    * (checking in the hidden checkbox and hiding out the row)
    */
  $('a.display-remove-link')
    .addClass('display-processed')
    .click(function() {
      var id = $(this).attr('id').replace('display-remove-link-', '');
      $('#display-row-' + id).hide();
      $('#display-removed-' + id).attr('checked', true);
      return false;
  });
  }
};

/**
 * Helper function to parse a querystring.
 */
Drupal.Views.parseQueryString = function (query) {
  var args = {};
  var pos = query.indexOf('?');
  if (pos != -1) {
    query = query.substring(pos + 1);
  }
  var pairs = query.split('&');
  for(var i in pairs) {
    if (typeof(pairs[i]) == 'string') {
      var pair = pairs[i].split('=');
      // Ignore the 'q' path argument, if present.
      if (pair[0] != 'q' && pair[1]) {
        args[decodeURIComponent(pair[0].replace(/\+/g, ' '))] = decodeURIComponent(pair[1].replace(/\+/g, ' '));
      }
    }
  }
  return args;
};

/**
 * Helper function to return a view's arguments based on a path.
 */
Drupal.Views.parseViewArgs = function (href, viewPath) {
  var returnObj = {};
  var path = Drupal.Views.getPath(href);
  // Ensure we have a correct path.
  if (viewPath && path.substring(0, viewPath.length + 1) == viewPath + '/') {
    var args = decodeURIComponent(path.substring(viewPath.length + 1, path.length));
    returnObj.view_args = args;
    returnObj.view_path = path;
  }
  return returnObj;
};

/**
 * Strip off the protocol plus domain from an href.
 */
Drupal.Views.pathPortion = function (href) {
  // Remove e.g. http://example.com if present.
  var protocol = window.location.protocol;
  if (href.substring(0, protocol.length) == protocol) {
    // 2 is the length of the '//' that normally follows the protocol
    href = href.substring(href.indexOf('/', protocol.length + 2));
  }
  return href;
};

/**
 * Return the Drupal path portion of an href.
 */
Drupal.Views.getPath = function (href) {
  href = Drupal.Views.pathPortion(href);
  href = href.substring(Drupal.settings.basePath.length, href.length);
  // 3 is the length of the '?q=' added to the url without clean urls.
  if (href.substring(0, 3) == '?q=') {
    href = href.substring(3, href.length);
  }
  var chars = ['#', '?', '&'];
  for (i in chars) {
    if (href.indexOf(chars[i]) > -1) {
      href = href.substr(0, href.indexOf(chars[i]));
    }
  }
  return href;
};

})(jQuery);
;
(function ($) {

/**
 * A progressbar object. Initialized with the given id. Must be inserted into
 * the DOM afterwards through progressBar.element.
 *
 * method is the function which will perform the HTTP request to get the
 * progress bar state. Either "GET" or "POST".
 *
 * e.g. pb = new progressBar('myProgressBar');
 *      some_element.appendChild(pb.element);
 */
Drupal.progressBar = function (id, updateCallback, method, errorCallback) {
  var pb = this;
  this.id = id;
  this.method = method || 'GET';
  this.updateCallback = updateCallback;
  this.errorCallback = errorCallback;

  // The WAI-ARIA setting aria-live="polite" will announce changes after users
  // have completed their current activity and not interrupt the screen reader.
  this.element = $('<div class="progress" aria-live="polite"></div>').attr('id', id);
  this.element.html('<div class="bar"><div class="filled"></div></div>' +
                    '<div class="percentage"></div>' +
                    '<div class="message">&nbsp;</div>');
};

/**
 * Set the percentage and status message for the progressbar.
 */
Drupal.progressBar.prototype.setProgress = function (percentage, message) {
  if (percentage >= 0 && percentage <= 100) {
    $('div.filled', this.element).css('width', percentage + '%');
    $('div.percentage', this.element).html(percentage + '%');
  }
  $('div.message', this.element).html(message);
  if (this.updateCallback) {
    this.updateCallback(percentage, message, this);
  }
};

/**
 * Start monitoring progress via Ajax.
 */
Drupal.progressBar.prototype.startMonitoring = function (uri, delay) {
  this.delay = delay;
  this.uri = uri;
  this.sendPing();
};

/**
 * Stop monitoring progress via Ajax.
 */
Drupal.progressBar.prototype.stopMonitoring = function () {
  clearTimeout(this.timer);
  // This allows monitoring to be stopped from within the callback.
  this.uri = null;
};

/**
 * Request progress data from server.
 */
Drupal.progressBar.prototype.sendPing = function () {
  if (this.timer) {
    clearTimeout(this.timer);
  }
  if (this.uri) {
    var pb = this;
    // When doing a post request, you need non-null data. Otherwise a
    // HTTP 411 or HTTP 406 (with Apache mod_security) error may result.
    $.ajax({
      type: this.method,
      url: this.uri,
      data: '',
      dataType: 'json',
      success: function (progress) {
        // Display errors.
        if (progress.status == 0) {
          pb.displayError(progress.data);
          return;
        }
        // Update display.
        pb.setProgress(progress.percentage, progress.message);
        // Schedule next timer.
        pb.timer = setTimeout(function () { pb.sendPing(); }, pb.delay);
      },
      error: function (xmlhttp) {
        pb.displayError(Drupal.ajaxError(xmlhttp, pb.uri));
      }
    });
  }
};

/**
 * Display errors on the page.
 */
Drupal.progressBar.prototype.displayError = function (string) {
  var error = $('<div class="messages error"></div>').html(string);
  $(this.element).before(error).hide();

  if (this.errorCallback) {
    this.errorCallback(this);
  }
};

})(jQuery);
;
/**
 * @file
 * Handles AJAX fetching of views, including filter submission and response.
 */
(function ($) {

/**
 * Attaches the AJAX behavior to Views exposed filter forms and key View links.
 */
Drupal.behaviors.ViewsAjaxView = {};
Drupal.behaviors.ViewsAjaxView.attach = function() {
  if (Drupal.settings && Drupal.settings.views && Drupal.settings.views.ajaxViews) {
    $.each(Drupal.settings.views.ajaxViews, function(i, settings) {
      Drupal.views.instances[i] = new Drupal.views.ajaxView(settings);
    });
  }
};

Drupal.views = {};
Drupal.views.instances = {};

/**
 * Javascript object for a certain view.
 */
Drupal.views.ajaxView = function(settings) {
  var selector = '.view-dom-id-' + settings.view_dom_id;
  this.$view = $(selector);

  // Retrieve the path to use for views' ajax.
  var ajax_path = Drupal.settings.views.ajax_path;

  // If there are multiple views this might've ended up showing up multiple times.
  if (ajax_path.constructor.toString().indexOf("Array") != -1) {
    ajax_path = ajax_path[0];
  }

  // Check if there are any GET parameters to send to views.
  var queryString = window.location.search || '';
  if (queryString !== '') {
    // Remove the question mark and Drupal path component if any.
    var queryString = queryString.slice(1).replace(/q=[^&]+&?|&?render=[^&]+/, '');
    if (queryString !== '') {
      // If there is a '?' in ajax_path, clean url are on and & should be used to add parameters.
      queryString = ((/\?/.test(ajax_path)) ? '&' : '?') + queryString;
    }
  }

  this.element_settings = {
    url: ajax_path + queryString,
    submit: settings,
    setClick: true,
    event: 'click',
    selector: selector,
    progress: { type: 'throbber' }
  };

  this.settings = settings;

  // Add the ajax to exposed forms.
  this.$exposed_form = $('#views-exposed-form-'+ settings.view_name.replace(/_/g, '-') + '-' + settings.view_display_id.replace(/_/g, '-'));
  this.$exposed_form.once(jQuery.proxy(this.attachExposedFormAjax, this));

  // Add the ajax to pagers.
  this.$view
    // Don't attach to nested views. Doing so would attach multiple behaviors
    // to a given element.
    .filter(jQuery.proxy(this.filterNestedViews, this))
    .once(jQuery.proxy(this.attachPagerAjax, this));

  // Add a trigger to update this view specifically. In order to trigger a
  // refresh use the following code.
  //
  // @code
  // jQuery('.view-name').trigger('RefreshView');
  // @endcode
  // Add a trigger to update this view specifically.
  var self_settings = this.element_settings;
  self_settings.event = 'RefreshView';
  this.refreshViewAjax = new Drupal.ajax(this.selector, this.$view, self_settings);
};

Drupal.views.ajaxView.prototype.attachExposedFormAjax = function() {
  var button = $('input[type=submit], button[type=submit], input[type=image]', this.$exposed_form);
  button = button[0];

  this.exposedFormAjax = new Drupal.ajax($(button).attr('id'), button, this.element_settings);
};

Drupal.views.ajaxView.prototype.filterNestedViews= function() {
  // If there is at least one parent with a view class, this view
  // is nested (e.g., an attachment). Bail.
  return !this.$view.parents('.view').size();
};

/**
 * Attach the ajax behavior to each link.
 */
Drupal.views.ajaxView.prototype.attachPagerAjax = function() {
  this.$view.find('ul.pager > li > a, th.views-field a, .attachment .views-summary a')
  .each(jQuery.proxy(this.attachPagerLinkAjax, this));
};

/**
 * Attach the ajax behavior to a singe link.
 */
Drupal.views.ajaxView.prototype.attachPagerLinkAjax = function(id, link) {
  var $link = $(link);
  var viewData = {};
  var href = $link.attr('href');
  // Construct an object using the settings defaults and then overriding
  // with data specific to the link.
  $.extend(
    viewData,
    this.settings,
    Drupal.Views.parseQueryString(href),
    // Extract argument data from the URL.
    Drupal.Views.parseViewArgs(href, this.settings.view_base_path)
  );

  // For anchor tags, these will go to the target of the anchor rather
  // than the usual location.
  $.extend(viewData, Drupal.Views.parseViewArgs(href, this.settings.view_base_path));

  this.element_settings.submit = viewData;
  this.pagerAjax = new Drupal.ajax(false, $link, this.element_settings);
};

Drupal.ajax.prototype.commands.viewsScrollTop = function (ajax, response, status) {
  // Scroll to the top of the view. This will allow users
  // to browse newly loaded content after e.g. clicking a pager
  // link.
  var offset = $(response.selector).offset();
  // We can't guarantee that the scrollable object should be
  // the body, as the view could be embedded in something
  // more complex such as a modal popup. Recurse up the DOM
  // and scroll the first element that has a non-zero top.
  var scrollTarget = response.selector;
  while ($(scrollTarget).scrollTop() == 0 && $(scrollTarget).parent()) {
    scrollTarget = $(scrollTarget).parent();
  }
  // Only scroll upward
  if (offset.top - 10 < $(scrollTarget).scrollTop()) {
    $(scrollTarget).animate({scrollTop: (offset.top - 10)}, 500);
  }
};

})(jQuery);
;
(function ($) {

/**
 * Attaches sticky table headers.
 */
Drupal.behaviors.tableHeader = {
  attach: function (context, settings) {
    if (!$.support.positionFixed) {
      return;
    }

    $('table.sticky-enabled', context).once('tableheader', function () {
      $(this).data("drupal-tableheader", new Drupal.tableHeader(this));
    });
  }
};

/**
 * Constructor for the tableHeader object. Provides sticky table headers.
 *
 * @param table
 *   DOM object for the table to add a sticky header to.
 */
Drupal.tableHeader = function (table) {
  var self = this;

  this.originalTable = $(table);
  this.originalHeader = $(table).children('thead');
  this.originalHeaderCells = this.originalHeader.find('> tr > th');
  this.displayWeight = null;

  // React to columns change to avoid making checks in the scroll callback.
  this.originalTable.bind('columnschange', function (e, display) {
    // This will force header size to be calculated on scroll.
    self.widthCalculated = (self.displayWeight !== null && self.displayWeight === display);
    self.displayWeight = display;
  });

  // Clone the table header so it inherits original jQuery properties. Hide
  // the table to avoid a flash of the header clone upon page load.
  this.stickyTable = $('<table class="sticky-header"/>')
    .insertBefore(this.originalTable)
    .css({ position: 'fixed', top: '0px' });
  this.stickyHeader = this.originalHeader.clone(true)
    .hide()
    .appendTo(this.stickyTable);
  this.stickyHeaderCells = this.stickyHeader.find('> tr > th');

  this.originalTable.addClass('sticky-table');
  $(window)
    .bind('scroll.drupal-tableheader', $.proxy(this, 'eventhandlerRecalculateStickyHeader'))
    .bind('resize.drupal-tableheader', { calculateWidth: true }, $.proxy(this, 'eventhandlerRecalculateStickyHeader'))
    // Make sure the anchor being scrolled into view is not hidden beneath the
    // sticky table header. Adjust the scrollTop if it does.
    .bind('drupalDisplaceAnchor.drupal-tableheader', function () {
      window.scrollBy(0, -self.stickyTable.outerHeight());
    })
    // Make sure the element being focused is not hidden beneath the sticky
    // table header. Adjust the scrollTop if it does.
    .bind('drupalDisplaceFocus.drupal-tableheader', function (event) {
      if (self.stickyVisible && event.clientY < (self.stickyOffsetTop + self.stickyTable.outerHeight()) && event.$target.closest('sticky-header').length === 0) {
        window.scrollBy(0, -self.stickyTable.outerHeight());
      }
    })
    .triggerHandler('resize.drupal-tableheader');

  // We hid the header to avoid it showing up erroneously on page load;
  // we need to unhide it now so that it will show up when expected.
  this.stickyHeader.show();
};

/**
 * Event handler: recalculates position of the sticky table header.
 *
 * @param event
 *   Event being triggered.
 */
Drupal.tableHeader.prototype.eventhandlerRecalculateStickyHeader = function (event) {
  var self = this;
  var calculateWidth = event.data && event.data.calculateWidth;

  // Reset top position of sticky table headers to the current top offset.
  this.stickyOffsetTop = Drupal.settings.tableHeaderOffset ? eval(Drupal.settings.tableHeaderOffset + '()') : 0;
  this.stickyTable.css('top', this.stickyOffsetTop + 'px');

  // Save positioning data.
  var viewHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
  if (calculateWidth || this.viewHeight !== viewHeight) {
    this.viewHeight = viewHeight;
    this.vPosition = this.originalTable.offset().top - 4 - this.stickyOffsetTop;
    this.hPosition = this.originalTable.offset().left;
    this.vLength = this.originalTable[0].clientHeight - 100;
    calculateWidth = true;
  }

  // Track horizontal positioning relative to the viewport and set visibility.
  var hScroll = document.documentElement.scrollLeft || document.body.scrollLeft;
  var vOffset = (document.documentElement.scrollTop || document.body.scrollTop) - this.vPosition;
  this.stickyVisible = vOffset > 0 && vOffset < this.vLength;
  this.stickyTable.css({ left: (-hScroll + this.hPosition) + 'px', visibility: this.stickyVisible ? 'visible' : 'hidden' });

  // Only perform expensive calculations if the sticky header is actually
  // visible or when forced.
  if (this.stickyVisible && (calculateWidth || !this.widthCalculated)) {
    this.widthCalculated = true;
    var $that = null;
    var $stickyCell = null;
    var display = null;
    var cellWidth = null;
    // Resize header and its cell widths.
    // Only apply width to visible table cells. This prevents the header from
    // displaying incorrectly when the sticky header is no longer visible.
    for (var i = 0, il = this.originalHeaderCells.length; i < il; i += 1) {
      $that = $(this.originalHeaderCells[i]);
      $stickyCell = this.stickyHeaderCells.eq($that.index());
      display = $that.css('display');
      if (display !== 'none') {
        cellWidth = $that.css('width');
        // Exception for IE7.
        if (cellWidth === 'auto') {
          cellWidth = $that[0].clientWidth + 'px';
        }
        $stickyCell.css({'width': cellWidth, 'display': display});
      }
      else {
        $stickyCell.css('display', 'none');
      }
    }
    this.stickyTable.css('width', this.originalTable.outerWidth());
  }
};

})(jQuery);
;
(function ($) {

Drupal.toolbar = Drupal.toolbar || {};

/**
 * Attach toggling behavior and notify the overlay of the toolbar.
 */
Drupal.behaviors.toolbar = {
  attach: function(context) {

    // Set the initial state of the toolbar.
    $('#toolbar', context).once('toolbar', Drupal.toolbar.init);

    // Toggling toolbar drawer.
    $('#toolbar a.toggle', context).once('toolbar-toggle').click(function(e) {
      Drupal.toolbar.toggle();
      // Allow resize event handlers to recalculate sizes/positions.
      $(window).triggerHandler('resize');
      return false;
    });
  }
};

/**
 * Retrieve last saved cookie settings and set up the initial toolbar state.
 */
Drupal.toolbar.init = function() {
  // Retrieve the collapsed status from a stored cookie.
  var collapsed = $.cookie('Drupal.toolbar.collapsed');

  // Expand or collapse the toolbar based on the cookie value.
  if (collapsed == 1) {
    Drupal.toolbar.collapse();
  }
  else {
    Drupal.toolbar.expand();
  }
};

/**
 * Collapse the toolbar.
 */
Drupal.toolbar.collapse = function() {
  var toggle_text = Drupal.t('Show shortcuts');
  $('#toolbar div.toolbar-drawer').addClass('collapsed');
  $('#toolbar a.toggle')
    .removeClass('toggle-active')
    .attr('title',  toggle_text)
    .html(toggle_text);
  $('body').removeClass('toolbar-drawer').css('paddingTop', Drupal.toolbar.height());
  $.cookie(
    'Drupal.toolbar.collapsed',
    1,
    {
      path: Drupal.settings.basePath,
      // The cookie should "never" expire.
      expires: 36500
    }
  );
};

/**
 * Expand the toolbar.
 */
Drupal.toolbar.expand = function() {
  var toggle_text = Drupal.t('Hide shortcuts');
  $('#toolbar div.toolbar-drawer').removeClass('collapsed');
  $('#toolbar a.toggle')
    .addClass('toggle-active')
    .attr('title',  toggle_text)
    .html(toggle_text);
  $('body').addClass('toolbar-drawer').css('paddingTop', Drupal.toolbar.height());
  $.cookie(
    'Drupal.toolbar.collapsed',
    0,
    {
      path: Drupal.settings.basePath,
      // The cookie should "never" expire.
      expires: 36500
    }
  );
};

/**
 * Toggle the toolbar.
 */
Drupal.toolbar.toggle = function() {
  if ($('#toolbar div.toolbar-drawer').hasClass('collapsed')) {
    Drupal.toolbar.expand();
  }
  else {
    Drupal.toolbar.collapse();
  }
};

Drupal.toolbar.height = function() {
  var $toolbar = $('#toolbar');
  var height = $toolbar.outerHeight();
  // In modern browsers (including IE9), when box-shadow is defined, use the
  // normal height.
  var cssBoxShadowValue = $toolbar.css('box-shadow');
  var boxShadow = (typeof cssBoxShadowValue !== 'undefined' && cssBoxShadowValue !== 'none');
  // In IE8 and below, we use the shadow filter to apply box-shadow styles to
  // the toolbar. It adds some extra height that we need to remove.
  if (!boxShadow && /DXImageTransform\.Microsoft\.Shadow/.test($toolbar.css('filter'))) {
    height -= $toolbar[0].filters.item("DXImageTransform.Microsoft.Shadow").strength;
  }
  return height;
};

})(jQuery);
;
