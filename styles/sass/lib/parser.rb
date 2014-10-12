
require 'rubygems'
require 'css_parser'

include CssParser

parser = CssParser::Parser.new

exit if !ARGV.empty?
parser.load_file!(ARGV.first)

p parser.find_by_selector('.device_NO_HASTOUCH')
#parser.each_selector do
#    |selector, declaration, specificity|
#    printf "selector = %s\n declaration = %s\n spec = %s\n", selector, declaration, specificity
#end
