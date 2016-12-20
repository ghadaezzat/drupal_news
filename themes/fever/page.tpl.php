<?php
$header               = $page['header'];
$search               = $page['search'];
$navbar               = $page['navbar'];
$help                 = $page['help'];
$showcase             = $page['showcase']; 
$content              = $page['content'];
$left                 = $page['first_sidebar'];
$right                = $page['second_sidebar'];
$content_bottom_one   = $page['content_bottom_one']; 
$content_bottom_two   = $page['content_bottom_two'];
$content_bottom_three = $page['content_bottom_three']; 
$content_bottom_four  = $page['content_bottom_four']; 
$content_bottom_five  = $page['content_bottom_five']; 
?>
  <div id="page">
    <div id="header"><div id="header-inner" class="clearfix">
	  <?php if ($secondary_menu): ?>
        <div id="secondary"><div id="secondary-inner-wrapper"><div id="secondary-inner">
          <?php print theme('links__system_secondary_menu', array('links' => $secondary_menu, 'attributes' => array('id' => 'secondary-menu', 'class' => array('links', 'inline', 'clearfix')), 'heading' => t('Secondary menu'))); ?>
        </div></div></div> <!-- /#secondary -->
      <?php endif; ?>
      <?php if ($logo || $site_name || $site_slogan): ?>
        <div id="logo-title">
          <?php if ($logo): ?>
            <div id="logo"><a href="<?php print $front_page; ?>" title="<?php print t('Home'); ?>" rel="home"><img src="<?php print $logo; ?>" alt="<?php print t('Home'); ?>" id="logo-image" /></a></div>
          <?php endif; ?>
          <?php if ($site_name): ?>  
		    <div id="site-name"><h1><a href="<?php print $front_page; ?>" title="<?php print t('Home'); ?>" rel="home"><?php print $site_name; ?></a></h1></div>
		  <?php endif; ?>
          <?php if ($site_slogan): ?>
            <div id="site-slogan"><?php print $site_slogan; ?></div>
          <?php endif; ?>
        </div> <!-- /#logo-title -->
      <?php endif; ?>
      <?php if ($header): ?>
        <div id="header-blocks">
          <?php print $header; ?>
        </div> <!-- /#header-blocks -->
      <?php endif; ?>
    </div></div> <!-- /#header-inner, /#header -->

	<div id="navbar"><div id="navbar-inner" class="clearfix">
      <?php if ($search): ?>
        <div id="search">
          <?php print $search; ?>
        </div> <!-- /#search block -->
      <?php endif; ?>
	  <?php if ($main_menu): ?>	    
        <div id="primary-left" <?php if ($search): print 'class="withsearch"';
		  else: print 'class="withoutsearch"'; 
		  endif; ?>>
		  <div id="primary-right"><div id="primary">
            <?php print theme('links__system_main_menu', array(
            'links' => $main_menu_expanded,
            'attributes' => array(
            'id' => 'main-menu',
            'class' => array('links', 'inline', 'clearfix'),
             ),
            'heading' => array(
            'text' => t('Main menu'),
            'level' => 'h2',
            'class' => array('element-invisible'),
            ),
            ));
            ?>
        </div></div></div>
      <?php endif; ?> <!-- /#primary -->
	</div></div>

  	<div id="top-border"></div>
    <div id="main">
	  <div id="main-inner" class="clearfix">
        <?php if ($showcase): ?>
          <div id="showcase"><div id="showcase-inner">
            <?php print $showcase; ?>
		  </div></div>
        <?php endif; ?> <!-- /#showcase -->     
		<div>
		  <div id="content-top">
		    <?php if ($breadcrumb && $breadcrumb != '<div class="breadcrumb"></div>'): print '<div id="breadcrumb-wrapper"><div id="breadcrumb">You are here: '.$breadcrumb.'</div></div>';
		    else: print '<div id="breadcrumb-wrapper"><div id="breadcrumb">You are here: <a href="/">Home</a></div></div>'; 
		    endif; ?>
			<div id="content-top-inner">
			  <div id="content-wrapper" class="clearfix">
		        <div id="content">
        <?php print render($title_prefix); ?>
        <?php if ($title): ?><h1 class="title" id="page-title"><?php print $title; ?></h1><?php endif; ?>
        <?php print render($title_suffix); ?>
        <?php if ($tabs): ?><div class="tabs"><?php print render($tabs); ?></div><?php endif; ?>
        <?php print render($page['help']); ?>
        <?php if ($action_links): ?><ul class="action-links"><?php print render($action_links); ?></ul><?php endif; ?>
        <?php print render($page['content']); ?>
        <?php print $feed_icons; ?>
		        </div>
		        <?php if ($left): ?>
                  <div id="sidebar-left">
                    <?php print $left; ?>
                  </div> <!-- /#sidebar-left -->
                <?php endif; ?>
		      </div>
			</div>
		  </div>
          <?php if ($right): ?>
            <div id="sidebar-right">
              <?php print $right; ?>
            </div> <!-- /#sidebar-right -->
          <?php endif; ?>
        </div>	  

	    <?php if ($content_bottom_one || $content_bottom_two || $content_bottom_three || $content_bottom_four): ?>
          <div id="content-bottom" ><div id="content-bottom-inner" class="<?php print $content_bottom; ?> clearfix">
            <?php if ($content_bottom_one): ?>
              <div id="content-bottom-one" class="column">
                <?php print $content_bottom_one; ?>
              </div><!-- /content-bottom-one -->
            <?php endif; ?>
            <?php if ($content_bottom_two): ?>
              <div id="content-bottom-two" class="column">
                <?php print $content_bottom_two; ?>
              </div><!-- /content-bottom-two -->
            <?php endif; ?>
	    	<?php if ($content_bottom_three): ?>
              <div id="content-bottom-three" class="column">
                <?php print $content_bottom_three; ?>
              </div><!-- /content-bottom-three -->
            <?php endif; ?>
		    <?php if ($content_bottom_four): ?>
              <div id="content-bottom-four" class="column">
                <?php print $content_bottom_four; ?>
              </div><!-- /content-bottom-four -->
            <?php endif; ?>
			<?php if ($content_bottom_five): ?>
              <div id="content-bottom-five">
                <?php print $content_bottom_five; ?>
              </div><!-- /content-bottom-five -->
            <?php endif; ?>
          </div></div> 
	    <?php endif; ?>
      </div>
    </div> <!-- /#main-inner, /#main -->
 	<div id="bottom-border"></div>    
    <div id="closure"><div id="closure-inner" class="clearfix"><div id="designed-by"><small><a href="http://www.antsin.com" title="Drupal theme">Design by Antsin</a></small>Drupal 7 port by <a href="http://itapplication.net">itapplication</div></div></div>
  </div><!-- /#page -->
