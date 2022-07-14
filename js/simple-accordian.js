<script>
    function initMenu() {
      $('#menu ul').hide();
      if ($('#menu li').has('ul')) $('#menu ul').prev().addClass('expandable');
      $('.expandable').click(
        function() {
            $(this).next().slideToggle();
            $(this).toggleClass('expanded');
          }
        );
      }
</script>