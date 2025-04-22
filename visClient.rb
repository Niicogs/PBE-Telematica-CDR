require 'net/http'
require 'json'
require 'gtk3'
require_relative 'client'
require_relative 'puzzle1b'


app = Gtk::Application.new("org.gtk.course_manager", :flags_none)

rf = Rfid.new  # classe del puzzle1b

app.signal_connect "activate" do |application|
  window = Gtk::ApplicationWindow.new(application)
  window.set_title("course_manager")
  window.set_default_size(400, 200)
  window.set_border_width(10)

  css_provider = Gtk::CssProvider.new
  css_provider.load_from_path(File.expand_path("style2.css", __dir__))
  Gtk::StyleContext.add_provider_for_screen(Gdk::Screen.default, css_provider, Gtk::StyleProvider::PRIORITY_USER)

  pantalla_login(window,rf)

end
app.run([$0] + ARGV)
