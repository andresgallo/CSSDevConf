
###################################################################
# Configuration file for all sass plugin libraries
#
# @author Eddy Nunez
# @version $Id: config.rb 21823 2013-10-25 15:41:14Z swetha $

ROOT       = File.expand_path( File.dirname( __FILE__ ) )
DOC_ROOT   = ROOT.match(/(.*styles).*/)[1]


module Sass

    #############################################################################
    # Configuration for css variant exporter, lib/cssVariants.rb
    ###################################################################
    # SPECIFICATION
    # Platform: Desktop, Safari, Chrome, Opera, Firefox, IE9+
    # Config: responsive.ini
    # Variant: juggernaut.notouch.css
    # Rule Sets Removed: .touch, .lt-ie9
    #
    # Platform: Desktop, IE 8
    # Config: responsive.ini
    # Variant: juggernaut.ie8.css (served via conditional HTML)
    # Rule Sets Removed: .touch
    #
    # Platform: Smart Phone (0, 570x570]
    # Config: mobile-small.ini
    # Variant: juggernaut.mobile-small.css
    # Rule Sets Removed: .lt-ie9, .device_NOT_HASTOUCH, media queries with min-width > 570
    #
    # Platform: Mobile/Tablet (570x570, infinity)
    # Config: mobile.ini
    # Variant: juggernaut.mobile.css
    # Rule Sets Removed: .lt-ie9, .device_NOT_HASTOUCH
    module CssExporter

       CSSPATH  = DOC_ROOT + ''

        # Filter tags - Can be regular expressions(RX) or ranges(RNG)
        # @see http://www.tutorialspoint.com/ruby/ruby_regular_expressions.htm
        # @see http://www.tutorialspoint.com/ruby/ruby_ranges.htm
        RX_IE8          = /lt-ie9/
        RX_TOUCH        = /device_HASTOUCH/
        RX_NOTOUCH      = /device_NOT_HASTOUCH/
        RNG_MOBISMALL   = (0 ... 570)
        RNG_MOBILE      = (570 ... 2**16)
        RNG_LARGE       = (940 ... 2**16)
        RX_MEDIA        = /(\w+)-width.*?(\d+\s*px)/
        RX_HOVER        = /:hover/
        RX_NORESP       = /notresponsive/

        # Export filter sets
        # The left-hand value is used to generate the file name.
        # The right-hand value is the filter set applied to the CSS file.
        EXCLUSION_FILTERS = {
            'notouch'      => [ RX_TOUCH, RX_IE8, RX_NORESP ],
            #'ie8'         => [ RX_TOUCH, RX_NORESP ], --- not needed if exporting ie8 styles
            'mobile-small' => [ RNG_MOBILE, RX_IE8, RX_NOTOUCH, RX_HOVER, RX_NORESP ],
            'mobile'       => [ RX_IE8, RX_NOTOUCH, RX_HOVER, RX_NORESP ],
            'noresp'       => [ RX_TOUCH, RX_IE8, RNG_MOBISMALL, RNG_MOBILE, RNG_LARGE]
        }
    end


    module TagExporter
        CSSPATH  = DOC_ROOT + ''
        # Export tags
        TAGS     = {
            :export_ie8    => 'lt-ie9',
            :export_noresp => 'notresponsive'
            #:touch => 'touch'
        }.freeze

    end

end
