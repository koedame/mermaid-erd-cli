ActiveRecord::Schema[7.1].define(version: 2024_01_01_000000) do
  create_table "teams", force: :cascade do |t|
    t.string "name", null: false
    t.timestamps
  end

  create_table "users", comment: "application users", force: :cascade do |t|
    t.references :team, null: false, foreign_key: true
    t.bigint "manager_id"
    t.string "email", null: false
    t.timestamps
    t.index ["team_id"], name: "index_users_on_team_id"
  end

  create_table "posts", force: :cascade do |t|
    t.references :user, null: false, foreign_key: true
    t.string "title"
    t.timestamps
  end

  create_table "schema_migrations", primary_key: "version", id: :string, force: :cascade do |t|
  end

  add_foreign_key "users", "users", column: "manager_id"
  add_foreign_key "posts", "users"
end
