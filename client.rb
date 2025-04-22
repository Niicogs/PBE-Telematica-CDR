require 'net/http'
require 'json'
require 'date'
require 'gtk3'
require_relative 'puzzle1b'

def llegir_targeta(window, rf)
  Thread.new do
    uid = rf.read_uid

    #Consultar l'UID amb el servidor
    uri = URI("http://localhost:3000/authenticate?uid=#{uid}")
    
    response = Net::HTTP.get_response(uri)

    if response.is_a?(Net::HTTPSuccess)
      student = JSON.parse(response.body)
      pantalla_principal(window, student, rf)
    else
      GLib::Idle.add do
        @error_label.set_text("No student found with UID #{uid}")
        @error_label.visible = true
        GLib::Timeout.add(5000) do
          pantalla_login(window, rf)
          false
        end
        false
      end
    end
  end
end

#mètode consulta
def consulta(query, &callback)
  uri = URI("http://localhost:3000/#{query}")

  Thread.new do
    response = Net::HTTP.get_response(uri)
    if response.is_a?(Net::HTTPSuccess)
      result = JSON.parse(response.body)
      tipus = query.split('?')
      data_type = tipus[0]

      case data_type
      when 'tasks'  
        result.sort_by! { |task| Date.parse(task["date"]) }
	result.each do |entry|
	  dia = entry["date"].split('T')
	  entry["date"] = dia[0]
        end
      when 'marks'
        result.sort_by! { |mark| mark["subject"] }
	result.each do |entry|
	  entry.delete("student_id")
        end
	result.each do |entry|
	  entry["mark"] = entry["mark"].to_s
	end
      when 'timetables'
        result = ordenar_horaris(result)
      else
        puts "Data types not recognised"
      end
      GLib::Idle.add do
        callback.call(result) if callback
        false
      end
    end
  end
end

def create_table(window, main_box, data)
  
  vbox = Gtk::Box.new(:vertical, 5)

  treeview = Gtk::TreeView.new
  treeview.set_name("treeview")
  
  liststore = Gtk::ListStore.new(*data[:columns].map { String })
  
  data[:rows].each do |item|
    values = data[:columns].map { |col| item[col] }

    iter = liststore.append
    iter.set_values(values)
  end
  
  treeview.model = liststore
  
  column_width = 400 / data[:columns].size
  
  data[:columns].each_with_index do |title, index|
    renderer = Gtk::CellRendererText.new
    column = Gtk::TreeViewColumn.new(title.capitalize, renderer, text: index)
    
    column.set_resizable(true)
    column.set_fixed_width(column_width)
    
    column.set_cell_data_func(renderer) do |column, cell, model, iter|
      cell.text = model.get_value(iter, index)
      row_index = model.get_path(iter).indices[0]
      
      cell.set_property("cell-background", row_index.even? ? "#87CEEB" : "#4682B4")
    end
    treeview.append_column(column)
  end

  return vbox.pack_start(treeview, :expand => true, :fill => true, :padding => 0)
end

def ordenar_horaris(timetables_data)
  today = Date.today.strftime("%A")
  current_hour = Time.now.strftime("%H:%M:%S")

  case today
  when "Monday"
    today = "Mon"
  when "Tuesday"
    today = "Tue"
  when "Wednesday"
    today = "Wed"
  when "Thursday"
    today = "Thu"
  when "Friday"
    today = "Fri"
  when "Saturday"
    today = "Sat"
  when "Sunday"
    today = "Sun"
  end

  days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  timetables_ant = []
  timetables_data.reject! do |timetable|
    timetable_day_index = days_order.index(timetable["day"])
    current_day_index = days_order.index(today)

    if timetable_day_index < current_day_index ||
       (timetable_day_index == current_day_index && timetable["hour"] < current_hour)
      timetables_ant << timetable
      true
    else
      false
    end
  end

  timetables_ant.sort_by! do |timetable|
    day_index = days_order.index(timetable["day"])
    hour = timetable["hour"]
    [day_index, hour]
  end

  timetables_data.sort_by! do |timetable|
    day_index = days_order.index(timetable["day"])
    hour = timetable["hour"]
    [day_index, hour]
  end

  return timetables_all = timetables_data + timetables_ant
end

def pantalla_login(window, rf)
  window.child&.destroy
  box = Gtk::Box.new(:vertical, 0)

  main_label = Gtk::Label.new("Please, login with your university card")
  main_label.set_justify(:center)
  main_label.set_halign(:center)

  @error_label = Gtk::Label.new("")
  @error_label.name = "error_label"
  @error_label.visible = false

  top_space = Gtk::Box.new(:vertical, 0)
  bottom_space = Gtk::Box.new(:vertical, 0)
  box.pack_start(top_space, expand: true, fill: true, padding: 0)
  box.pack_start(main_label, expand: false, fill: false, padding: 5)
  box.pack_start(@error_label, expand: false, fill: false, padding: 5)
  box.pack_start(bottom_space, expand: true, fill: true, padding: 0)

  window.child = box
  window.show_all
  llegir_targeta(window, rf)
  temporitzador(window, rf)
end

def pantalla_principal(window, student, rf)
  window.child&.destroy
  main_box = Gtk::Box.new(:vertical, 10)

  # Barra superior amb nom i botó logout
  header_box = Gtk::Box.new(:horizontal, 10)
  welcome_label = Gtk::Label.new("Welcome, #{student["name"]}")
  logout_button = Gtk::Button.new(label: "Logout")
  header_box.pack_start(welcome_label, expand: true, fill: true, padding: 5)
  header_box.pack_start(logout_button, expand: false, fill: true, padding: 5)

  # Barra de cerca
  search_entry = Gtk::Entry.new
  search_entry.placeholder_text = "Enter your query..."
  window.signal_connect("show") do
    search_entry.grab_focus
  end

  results_box = Gtk::Box.new(:vertical, 5)
  main_box.pack_start(header_box, expand: false, fill: true, padding: 5)
  main_box.pack_start(search_entry, expand: false, fill: true, padding: 5)
  main_box.pack_start(results_box, expand: true, fill: true, padding: 5)

  search_entry.signal_connect "activate" do
    query = search_entry.text
    consulta(query) do |result|
      results_box.each { |child| results_box.remove(child) }
      tipus = query.split('?')
      data_type = tipus[0]

      case data_type
      when 'tasks'
        new_results_box = create_table(window, new_results_box, {columns: ["date", "subject", "name"], rows: result })
      when 'timetables'
        new_results_box = create_table(window, new_results_box, {columns: ["day", "hour", "subject", "room"], rows: result })
      when 'marks'
        new_results_box = create_table(window, new_results_box, {columns: ["subject", "name", "mark"], rows: result })
      else
        puts "Data types not recognised"
      end

      results_box.pack_start(new_results_box, expand: true, fill: true, padding: 5)
      window.show_all
    end
  end

  logout_button.signal_connect "clicked" do
    pantalla_login(window, rf)
  end

  window.child = main_box
  window.show_all
end

def sortir_per_inactivitat(window, rf)
  puts "Session closed due to inactivity."
  pantalla_login(window, rf)
end

def iniciar_temporitzador(window, rf)
  if @temporitzador_inactivitat
    GLib::Source.remove(@temporitzador_inactivitat)
  end

  @temporitzador_inactivitat = GLib::Timeout.add(120000) do
    sortir_per_inactivitat(window, rf)
    false
  end
end

def temporitzador(window, rf)
  @temporitzador_inactivitat = nil

  # Quan l'usuari fa alguna acció, reiniciar el temporitzador
  window.signal_connect('button-press-event') do
    iniciar_temporitzador(window, rf) # Reiniciar el temporitzador quan es fa clic
    false
  end
  window.signal_connect('key-press-event') do
    iniciar_temporitzador(window, rf) # Reiniciar el temporitzador
    false
  end

  # Inicialitzar el temporitzador quan es fa login
  iniciar_temporitzador(window, rf)
end
