plugins { kotlin("jvm") version "2.4.21" }
kotlin { jvmToolchain(17) }
dependencies { testImplementation("junit:junit:4.13.2") }
tasks.test { useJUnit() }
