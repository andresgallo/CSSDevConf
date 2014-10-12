###################################################################
# SaSS lib plugin: cssVariants
# This lib plugin is designed to remove rulesets and media queries
# from the generated css output from SaSS. Configuration determines
# which rulesets/media queries are to be excluded from the generated
# variants.
#
# @see      config.rb
# @author   Eddy Nunez <enunez@marvel.com>
# @version  $Id: cssVariants.rb 17923 2013-06-08 02:39:33Z nunez $

require 'sass'
require 'sass/plugin'
require 'lib/config'

module Sass

    # Visitors::ToCssFiltered class used to filter out rulesets and media queries nodes
    # based on the configuration provided in config.rb
    # @extends Visitors::ToCss
    class Sass::Tree::Visitors::ToCssFiltered < Sass::Tree::Visitors::ToCss

        attr_reader :filter_list

        def initialize
            @filter_list = []
            super
        end

        def filter_list=(value)
            @filter_list = value
            @filter_list.instance_eval do
                def only(type)
                    self.map {|v| v if v.is_a?(type) }.compact
                end
            end
        end

        def visit(node)
            super
        end

        def visit_rule(node)
            return '' if @filter_list.only(Regexp).any? {
                |rx| rx === node.resolved_rules.to_s
            }
            super
        end

        def visit_media(node)
            query  = node.resolved_query.to_css
            widths = {}
            query.scan(CssExporter::RX_MEDIA) {
                |wt, wv| widths[wt.to_sym] = wv
            }
            return '' if @filter_list.only(Range).any? {
                |rng| rng === widths[:min].to_i #|| rng === widths[:max].to_i
            }
            super
        end
    end

end

Sass::Plugin::Compiler.class_eval do
    private
    def update_stylesheet_hook(filename, css)
        update_stylesheet_original(filename, css)
        engine_opts = engine_options(:css_filename => css, :filename => filename)
        tree = Sass::Engine.for_file(filename, engine_opts).to_tree

        result = Sass::Tree::Visitors::Perform.visit(tree)
        result, extends = Sass::Tree::Visitors::Cssize.visit(result)
        Sass::Tree::Visitors::Extend.visit(result, extends)

        cssVisitor = Sass::Tree::Visitors::ToCssFiltered.new
        buffers = {}
        Sass::CssExporter::EXCLUSION_FILTERS.each do |k,f|
            cssVisitor.filter_list = f
            buffers[k] = cssVisitor.visit(result)
        end

        variants  = []
        file_args = [ Sass::CssExporter::CSSPATH, File.basename(css,'.css') ]
        buffers.each do |segment, buf|
            file_args[2] = segment
            variant = sprintf "%s/%s.%s.css", *file_args
            variants << segment
            File.open(variant, 'w') { |f| f.write(buf) }
        end
        puts ">>> Css variants created: [#{variants.join(', ')}]" unless variants.empty?

    end

    alias_method :update_stylesheet_original, :update_stylesheet
    alias_method :update_stylesheet, :update_stylesheet_hook

end
