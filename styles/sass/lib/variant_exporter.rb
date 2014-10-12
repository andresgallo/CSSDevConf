###################################################################
# SaSS lib plugin: CssExporter
# This lib plugin is designed to remove sections of the generated
# css output from SaSS based on configuration.
#
# @author   Eddy Nunez <enunez@marvel.com>
# @version  $Id: variant_exporter.rb 17069 2013-05-07 17:56:25Z nunez $

# Platform: Desktop, Safari, Chrome, Opera, Firefox, IE9+
# Config: responsive.ini
# Variant: juggernaut.notouch.css
# Rule Sets Removed: .device_HASTOUCH, .lt-ie9
# 
# Platform: Desktop, IE 8
# Config: responsive.ini
# Variant: juggernaut.ie8.css (served via conditional HTML)
# Rule Sets Removed: .device_HASTOUCH
# 
# Platform: Smart Phone (0, 570x570]
# Config: mobile-small.ini
# Variant: juggernaut.mobile-small.css
# Rule Sets Removed: .lt-ie9, .device_NOT_HASTOUCH, media queries with min-wi=
# dth > 570
# 
# Platform: Mobile/Tablet (570x570, infinity)
# Config: mobile.ini
# Variant: juggernaut.mobile.css
# Rule Sets Removed: .lt-ie9, .device_NOT_HASTOUCH

puts "THIS IS DEFUNCT/ARCHIVAL CODE; DONT RUN AGAIN"; abort

require "sass"

module Sass
    module CssExporter

        # this code expects to be inside .../www/i/css/sass/lib folder
        CSSPATH  = File.expand_path(File.dirname(__FILE__) + '/../../')
        TAGS     = {
            :ie8          => 'lt-ie9',
            :touch        => 'device_HASTOUCH',
            :noTouch      => 'device_NOT_HASTOUCH',
            :mobile_small => (0 ... 570),
            :mobile       => (570 .. 2**16)
        }.freeze

        EXCLUSION_RULES = {
            :desktop    => [ :mobile ]
        }

        def self.tag_filter(css, opts)

            styles    = Hash.new { |hash, key| hash[key] = [] }
            file_args = [ CSSPATH, opts[:original_filename].sub(/\.\w*?$/,'') ]

            Sass::CssExporter::TAGS.each {
                |tag_id, tag|
                next if tag.class != String
                re = Regexp.new('\n?[\w\s]*\.' + tag + '.*?\}\n?', Regexp::MULTILINE)
                css.gsub!(re) do |match|
                    styles[tag_id] << match.sub(/\n\s+/, "\n")
                    ''
                end

                # Write to export file
                unless styles[tag_id].empty? then
                    file_args[2] = tag_id
                    export_file = sprintf "%s/%s-%s.css", *file_args
                    printf ">>> Exporting %d %s styles: %s\n", styles[tag_id].count, tag_id, export_file
                    File.open( export_file, 'w') {
                        |f| f.write( styles[tag_id].join )
                    }
                end
            }

            css
        end

        def self.media_filter(tree, opts)
            file_args  = [ CSSPATH, opts[:original_filename].sub(/\.\w*?$/,'') ]
            media_list = Hash.new { |hash, key| hash[key] = [] }
            Sass::Tree::Visitors::Cssize.visit(tree).first.each do |node|
                next if node.class != Sass::Tree::MediaNode
                #print node.class, " has children? ", node.has_children, "\n"
                #Sass::Tree::DirectiveNode.resolve
                media_query = node.resolved_query.to_css
                #p node.name, media_query
                Sass::CssExporter::TAGS.each do |tag_id, tagRange|
                    next if tagRange.class != Range
                    widths = {}
                    media_query.scan(/(\w+)-width.*?(\d+\s*px)/) {
                        |wt, wv| widths[wt.to_sym] = wv
                    }
                    #p widths
                    media_list[tag_id] << node if tagRange === widths[:min].to_i
                    #p media_list[tag_id].class; abort
                end


            end
                #p media_list #.each { |k,v| print "K = #{k}, V = #{v.inspect}\n" }
                # Write to export file
                media_list.each do |tag_id, nodes|
                    media_queries = nodes.map { |n| Sass::Tree::Visitors::ToCss.visit(n) }

                    file_args[2] = tag_id
                    export_file = sprintf "%s/%s-%s.css", *file_args
                    printf ">>> Exporting %d %s styles: %s\n", nodes.count, tag_id, export_file
                    File.open( export_file, 'w') {
                        |f| f.write( media_queries.join("\n") )
                    }
                end
            abort
        end            
    end
end

Sass::Engine.class_eval do
    def render_with_exportfilters
        #Sass::CssExporter.tag_filter(render_without_exporting, options)

        ss_tree = Sass::Tree::Visitors::Perform.visit(to_tree)
        Sass::CssExporter.media_filter(ss_tree, options)
    end
    alias_method :render_without_exporting, :render
    alias_method :render, :render_with_exportfilters
    alias_method :to_css, :render_with_exportfilters
end