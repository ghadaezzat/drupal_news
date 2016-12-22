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

Drupal.behaviors.textarea = {
  attach: function (context, settings) {
    $('.form-textarea-wrapper.resizable', context).once('textarea', function () {
      var staticOffset = null;
      var textarea = $(this).addClass('resizable-textarea').find('textarea');
      var grippie = $('<div class="grippie"></div>').mousedown(startDrag);

      grippie.insertAfter(textarea);

      function startDrag(e) {
        staticOffset = textarea.height() - e.pageY;
        textarea.css('opacity', 0.25);
        $(document).mousemove(performDrag).mouseup(endDrag);
        return false;
      }

      function performDrag(e) {
        textarea.height(Math.max(32, staticOffset + e.pageY) + 'px');
        return false;
      }

      function endDrag(e) {
        $(document).unbind('mousemove', performDrag).unbind('mouseup', endDrag);
        textarea.css('opacity', 1);
      }
    });
  }
};

})(jQuery);
;
/**
 * @file
 * Javascript functionality for the Display Suite Extras administration UI.
 */

(function ($) {

Drupal.behaviors.DSExtrasSummaries = {
  attach: function (context) {

    $('#edit-additional-settings-fs1', context).drupalSetSummary(function (context) {
      var fieldtemplates = $('#edit-additional-settings-fs1-ds-extras-field-template', context);

      if (fieldtemplates.is(':checked')) {
        var fieldtemplate = $('#edit-additional-settings-fs1-ft-default option:selected').text();
        return Drupal.t('Enabled') + ': ' + Drupal.t(fieldtemplate);
      }

      return Drupal.t('Disabled');
    });

    $('#edit-additional-settings-fs2', context).drupalSetSummary(function (context) {
      var extra_fields = $('#edit-additional-settings-fs2-ds-extras-fields-extra', context);

      if (extra_fields.is(':checked')) {
        return Drupal.t('Enabled');
      }

      return Drupal.t('Disabled');
    });

    $('#edit-additional-settings-fs4', context).drupalSetSummary(function (context) {
      var vals = [];

      $('input:checked', context).parent().each(function () {
        vals.push(Drupal.checkPlain($.trim($('.option', this).text())));
      });

      if (vals.length > 0) {
        return vals.join(', ');
      }
      return Drupal.t('Disabled');
    });
  }
};

/**
 * Field template.
 */
Drupal.behaviors.settingsToggle = {
  attach: function (context) {

    // Bind on click.
    $('.field-formatter-settings-edit-form', context).once('ds-ft', function() {

      var fieldTemplate = $(this);

      // Bind on field template select button.
      fieldTemplate.find('.ds-extras-field-template').change(function() {
        ds_show_expert_settings(fieldTemplate);
      });

      ds_show_expert_settings(fieldTemplate);

    });

    // Show / hide settings on field template form.
    function ds_show_expert_settings(element, open) {
      field = element;
      ft = $('.ds-extras-field-template', field).val();

      if (ft == 'theme_ds_field_expert') {
        // Show second, third, fourth, fifth and sixth label.
        if ($('.lb .form-item:nth-child(1)', field).is(':visible')) {
          $('.lb .form-item:nth-child(2), .lb .form-item:nth-child(3), .lb .form-item:nth-child(4), .lb .form-item:nth-child(5), .lb .form-item:nth-child(6)', field).show();
        }
        // Remove margin from update button.
        $('.ft-update', field).css({'margin-top': '-10px'});
        // Show wrappers.
        $('.lbw, .ow, .fis, .fi', field).show();
        // Show prefix and suffix
        $('.field-prefix', field).show();
        $('.field-suffix', field).show();
      }
      else {
        // Hide second, third, fourth, fifth and sixth  label.
        $('.lb .form-item:nth-child(2), .lb .form-item:nth-child(3), .lb .form-item:nth-child(4), .lb .form-item:nth-child(5), .lb .form-item:nth-child(6)', field).hide();
        // Add margin on update button.
        $('.ft-update', field).css({'margin-top': '10px'});
        // Hide wrappers.
        $('.lbw, .ow, .fis, .fi', field).hide();
        // Hide prefix and suffix
        $('.field-prefix', field).hide();
        $('.field-suffix', field).hide();
      }

      // Colon.
      if (ft == 'theme_field' || ft == 'theme_ds_field_reset') {
        $('.colon-checkbox', field).parent().hide();
      }
      else if ($('.lb .form-item:nth-child(1)', field).is(':visible')) {
        $('.colon-checkbox', field).parent().show();
      }

      // CSS classes.
      if (ft != 'theme_ds_field_expert' && ft != 'theme_ds_field_reset') {
        $('.field-classes', field).show();
      }
      else {
        $('.field-classes', field).hide();
      }
    }

    $('.label-change').change(function() {
      var field = $(this).parents('tr');
      if ($('.field-template', field).length > 0) {
        ft = $('.ds-extras-field-template', field).val();
        if (ft == 'theme_field' || ft == 'theme_ds_field_reset') {
          $('.colon-checkbox', field).parent().hide();
        }
      }
    });
  }
};

})(jQuery);
;
