Pod::Spec.new do |s|
  s.name           = 'ExpoAlarmKit'
  s.version        = '1.0.0'
  s.summary        = 'Full-screen alarm module for Expo'
  s.description    = 'Production-grade alarm module with FSI on Android and Critical Alerts on iOS'
  s.author         = 'UNiTIME'
  s.homepage       = 'https://github.com/SkidGod4444/unitime'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
