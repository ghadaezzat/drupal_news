<?php
  function fever_preprocess_page(&$vars) {
    // ....
 
    // Get the entire main menu tree
    $main_menu_tree = menu_tree_all_data('main-menu');

   
// Add the rendered output to the $main_menu_expanded variable
    $vars['main_menu_expanded'] = menu_tree_output($main_menu_tree);
  }
 
  function fever_links__system_main_menu($vars) {
    $class = implode($vars['attributes']['class'], ' ');
    $html = '<ul class="' . $class . '">';
    foreach ($vars['links'] as $key => $link) {
      if (is_numeric($key)) {
        $sub_menu = '';
        $link_class = '';
		$link_title = '<span>';
        $link_title .= $link['#title'];
        // Check for sub menu - note I've only checked this for 2 levels
        // it might not work for 3 level menus.
        if (!empty($link['#below'])) {
          $link_class = ' class="dropdown"';
          $link['#attributes']['class'][] = 'dropdown-toggle';
          $link['#attributes']['data-toggle'][] = 'dropdown';
          // And recurse.
          $sub_menu = theme('links__system_main_menu', array('links' => $link['#below'], 'attributes' => array('class' => array('dropdown-menu'))));          
        }
        $html .= '<li' . $link_class . '>' . l($link_title, $link['#href'], array('html' => 'true', 'attributes' => $link['#attributes'])).'</span>' . $sub_menu . '</li>';
      }
    }
    $html .= '</ul>';

    return
$html;
  }
?>